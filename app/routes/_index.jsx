import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { json, useLoaderData } from "@remix-run/react";
import { createClient } from "../../utils/supabase.server";
import Loader from "../components/loader";
import Draggable from "react-draggable";

const Experience = lazy(() => import("../components/experience"));

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

function parseGLTF(arrayBuffer) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.parse(
      arrayBuffer,
      "", // path is empty, resources embedded or not needed
      (gltf) => resolve(gltf.scene),
      (error) => reject(error)
    );
  });
}

export const loader = async ({ request }) => {
  const supabase = createClient(request);

  const { data, error } = await supabase
    .from("terminal_dialogs")
    .select("id, message, expects_input, order, variable")
    .order("order", { ascending: true });

  if (error) throw new Error(error.message);

  return json(data);
};

const TERMINAL_COLORS = [
  "#00FF00",
  "#FF4500",
  "#00CED1",
  "#FFD700",
  "#ADFF2F",
  "#FF69B4",
  "#1E90FF",
  "#FF6347",
  "#7FFF00",
  "#BA55D3",
];

export default function Index() {
  const dialogData = useLoaderData();
  const [stepIndex, setStepIndex] = useState(0);
  const [step, setStep] = useState("input");
  const [inputValues, setInputValues] = useState({});
  const [inputText, setInputText] = useState("");
  const [progress, setProgress] = useState(0);
  const [scene, setScene] = useState(null);
  const containerRef = useRef(null);
  const [finishedLoading, setFinishedLoading] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const currentDialog = dialogData[stepIndex];
  const colorMapRef = useRef({});

  useEffect(() => {
    // Preload the Experience component when the app mounts
    import("../components/experience");
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, [stepIndex]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAndParseGLTF(url) {
      const controller = new AbortController();
      try {
        const res = await fetch(url, { signal: controller.signal });
        const contentLength = res.headers.get("content-length");

        if (!contentLength || !res.body) {
          // no progress info, just parse whole buffer
          const arrayBuffer = await res.arrayBuffer();
          setScene(await parseGLTF(arrayBuffer));
          setFinishedLoading(true);

          console.log("upper", timerFinished);

          if (timerFinished) setStep("experience");

          return await parseGLTF(arrayBuffer);
        }

        const total = parseInt(contentLength, 10);
        let loaded = 0;
        const reader = res.body.getReader();

        const chunks = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          setProgress(Math.round((loaded / total) * 100));
        }

        // Combine chunks into one Uint8Array
        let length = 0;
        for (const chunk of chunks) length += chunk.length;
        const arrayBuffer = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) {
          arrayBuffer.set(chunk, offset);
          offset += chunk.length;
        }

        setScene(await parseGLTF(arrayBuffer.buffer));
        setFinishedLoading(true);
        console.log("dwon", timerFinished);

        if (timerFinished) setStep("experience");

        return await parseGLTF(arrayBuffer.buffer);
      } finally {
        controller.abort();
      }
    }

    if (step == "input") fetchAndParseGLTF("/model.glb");
    else {
      const waitTimer = setTimeout(() => {
        setTimerFinished(true);
        if (finishedLoading) setStep("experience");
      }, 7900);

      return () => {
        clearTimeout(waitTimer);
        controller.abort();
      };
    }
  }, [step, finishedLoading, timerFinished]);

  function onKeyDown(e) {
    if (e.key === "Enter") {
      if (currentDialog?.expects_input && inputText.trim() === "") return;

      if (currentDialog.expects_input && currentDialog.variable) {
        setInputValues((prev) => ({
          ...prev,
          [currentDialog.variable]: inputText.trim(),
        }));
      }

      if (stepIndex + 1 < dialogData.length) {
        setStepIndex(stepIndex + 1);
        setInputText("");
      } else {
        setStep("loading");
      }
    } else if (e.key.length === 1) {
      setInputText((prev) => prev + e.key);
    } else if (e.key === "Backspace") {
      setInputText((prev) => prev.slice(0, -1));
    }
  }

  function parseMessage(msg) {
    return msg.replace(/\{(\w+)\}/g, (_, key) => {
      if (!colorMapRef.current[key]) {
        const randomColor =
          TERMINAL_COLORS[Math.floor(Math.random() * TERMINAL_COLORS.length)];
        colorMapRef.current[key] = randomColor;
      }
      const value = inputValues[key] || `{${key}}`;
      return `<span style="color:${colorMapRef.current[key]}">${value}</span>`;
    });
  }

  useEffect(() => {
    const goFullscreen = async () => {
      const el = document.documentElement;
      if (el.requestFullscreen && !document.fullscreenElement) {
        try {
          await el.requestFullscreen();
        } catch (err) {
          console.warn("Fullscreen request failed:", err);
        }
      }
    };

    const handleUserInput = () => {
      goFullscreen();
      window.removeEventListener("click", handleUserInput);
      window.removeEventListener("keydown", handleUserInput);
      window.removeEventListener("touchstart", handleUserInput);
    };

    window.addEventListener("click", handleUserInput);
    window.addEventListener("keydown", handleUserInput);
    window.addEventListener("touchstart", handleUserInput);

    return () => {
      window.removeEventListener("click", handleUserInput);
      window.removeEventListener("keydown", handleUserInput);
      window.removeEventListener("touchstart", handleUserInput);
    };
  }, []);

  return (
    <>
      <style>{`
        body,html,#root {
          background: #121212;
          color: white;
          margin:0; padding:0; height:100%;
          display: flex; justify-content: center; align-items: center;
          font-family: monospace, monospace;
          overflow: 'hidden;
        }
        .terminalWindow {
          width: 380px;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 0 30px #0008;
          user-select: none;
          outline: none;
        }
        .fakeMenu {
          height: 30px;
          background: #bbb;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 8px;
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
        }
        .fakeButtons {
          height: 14px;
          width: 14px;
          border-radius: 50%;
          border: 1.5px solid #0006;
          background-color: #ff3b47;
          box-shadow: inset 0 0 5px #a00a0a;
        }
        .fakeMinimize {
          background-color: #ffc100;
          border-color: #9d802c;
          box-shadow: inset 0 0 5px #a68300;
        }
        .fakeZoom {
          background-color: #00d742;
          border-color: #049931;
          box-shadow: inset 0 0 5px #008a2b;
        }
        .fakeScreen {
          background-color: #151515;
          min-height: 180px;
          padding: 18px 24px;
          font-size: 1.2rem;
          line-height: 1.4;
          border-bottom-left-radius: 6px;
          border-bottom-right-radius: 6px;
          white-space: pre-wrap;
          overflow-wrap: break-word;
          color: white;
          user-select: text;
        }
        .cursor {
          display: inline-block;
          background-color: currentColor;
          width: 9px;
          height: 1.2em;
          margin-left: 3px;
          animation: blink 1s step-start infinite;
          vertical-align: bottom;
        }
        @keyframes blink {
          0%, 40% { opacity: 1; }
          50%, 90% { opacity: 0; }
          100% { opacity: 1; }
        }
        .promptArrow {
          display: inline-block;
          margin-right: 6px;
          color: #9CD9F0;
          user-select: none;
        }
        .scanlines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.04) 0px,
            rgba(255, 255, 255, 0.04) 1px,
            transparent 1px,
            transparent 2px
          );
          mix-blend-mode: overlay;
          animation: flicker 0.8s infinite linear;
        }
        @keyframes flicker {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {step === "input" && (
        <>
          <main>
            <header>
              <svg
                className="tagline fluid"
                viewBox="1521 1500 882 125"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="currentColor"
                  d="M1548.5 1597c-5.2 0-9-1.2-11.4-3.5-2.3-2.4-3.5-6.1-3.5-11.2v-48.6h12.3v47.5c0 2.3.5 4 1.5 5 1 .8 2.6 1.3 4.8 1.3h7.2v9.5h-11ZM1568.4 1597v-68.2h12.3v28.7h-1.5c.5-3 1.5-5.4 3-7.3 1.6-1.9 3.5-3.3 5.7-4.2 2.3-1 4.7-1.4 7.4-1.4 3.8 0 7 .8 9.5 2.5 2.6 1.6 4.6 3.9 5.9 6.8 1.3 3 2 6.3 2 10.2v32.9h-12.3v-30c0-4.1-.7-7.2-2.1-9.3-1.4-2-3.6-3.1-6.6-3.1-3.4 0-6 1-8 3.2s-3 5.4-3 9.5v29.7h-12.3ZM1647 1598.2c-5 0-9.5-1.1-13.3-3.3a22.5 22.5 0 0 1-8.7-9.4c-2-4-3.1-8.8-3.1-14.1 0-5.4 1-10 3-14 2.1-4 5-7.2 8.7-9.5 3.8-2.2 8.2-3.3 13.2-3.3 4.8 0 9 1 12.7 3.3 3.7 2.1 6.6 5.3 8.6 9.4 2 4 3 9 3 14.7v2.8h-36.4c.2 4.5 1.4 7.9 3.6 10.2a12 12 0 0 0 8.8 3.4c2.8 0 5-.6 6.9-1.9 1.8-1.2 3-3 3.8-5.2l12.6.7c-1.4 5-4.2 9-8.4 11.8-4 3-9 4.4-15 4.4Zm-12.3-31.6h23.7c-.3-4.2-1.5-7.3-3.6-9.2-2.1-2-4.8-3.1-8-3.1-3.3 0-6 1-8.2 3.2a15.2 15.2 0 0 0-4 9ZM1726.5 1598.2a23.2 23.2 0 0 1-22.2-12.7c-2-4-3-8.8-3-14.1 0-5.5 1-10.2 3-14.1 2.2-4 5.1-7.2 8.9-9.3a26 26 0 0 1 13.3-3.4c5 0 9.5 1.1 13.3 3.4a22 22 0 0 1 8.7 9.3c2.1 4 3.2 8.6 3.2 14 0 5.5-1 10.2-3.2 14.2-2 4-5 7.2-8.7 9.4a26 26 0 0 1-13.3 3.3Zm0-10c4 0 7-1.5 9.2-4.4 2.1-3 3.2-7.1 3.2-12.4 0-5.3-1-9.4-3.2-12.3-2.2-3-5.2-4.5-9.2-4.5-4 0-7 1.5-9.2 4.5-2.1 3-3.2 7-3.2 12.3 0 5.3 1 9.4 3.2 12.4 2.2 2.9 5.3 4.4 9.2 4.4ZM1761.2 1597v-51.3h11.1l.5 14.4-1.5-.5a19 19 0 0 1 3.2-8.7c1.6-2.2 3.6-3.8 5.9-4.8 2.3-1 4.8-1.5 7.6-1.5 3.7 0 6.9.8 9.5 2.5 2.6 1.7 4.6 4 6 6.9 1.3 2.9 2 6.2 2 10v33H1793v-29c0-2.9-.3-5.3-.8-7.3-.6-2-1.6-3.5-2.9-4.5-1.3-1-3-1.6-5.2-1.6a9.9 9.9 0 0 0-7.9 3.4c-1.9 2.3-2.8 5.7-2.8 10v29h-12.3ZM1839.8 1598.2c-5.1 0-9.6-1.1-13.4-3.3a22.5 22.5 0 0 1-8.7-9.4c-2-4-3-8.8-3-14.1 0-5.4 1-10 3-14s5-7.2 8.6-9.5c3.8-2.2 8.2-3.3 13.2-3.3 4.9 0 9.1 1 12.8 3.3 3.7 2.1 6.5 5.3 8.5 9.4 2 4 3 9 3 14.7v2.8h-36.4c.3 4.5 1.5 7.9 3.6 10.2a12 12 0 0 0 8.9 3.4c2.7 0 5-.6 6.8-1.9 1.8-1.2 3.1-3 3.8-5.2l12.6.7c-1.4 5-4.2 9-8.3 11.8-4.1 3-9.1 4.4-15 4.4Zm-12.4-31.6h23.7c-.2-4.2-1.4-7.3-3.5-9.2-2.1-2-4.8-3.1-8.1-3.1s-6 1-8.2 3.2a15.2 15.2 0 0 0-3.9 9ZM1907.8 1597l-15.5-51.3h12.6l10 37.4 10.2-37.4h10.8l10.4 37.4 10-37.4h12.5l-15.4 51.3h-12.7l-10.2-34.4-10 34.4h-12.7ZM1976.6 1597v-68.2h12.3v28.7h-1.5c.5-3 1.5-5.4 3-7.3 1.6-1.9 3.5-3.3 5.7-4.2 2.2-1 4.7-1.4 7.4-1.4 3.8 0 7 .8 9.5 2.5 2.6 1.6 4.6 3.9 5.8 6.8 1.4 3 2 6.3 2 10.2v32.9h-12.2v-30c0-4.1-.7-7.2-2.1-9.3-1.4-2-3.7-3.1-6.7-3.1-3.3 0-6 1-8 3.2s-2.9 5.4-2.9 9.5v29.7h-12.3ZM2055.3 1598.2a23.2 23.2 0 0 1-22.2-12.7c-2-4-3-8.8-3-14.1 0-5.5 1-10.2 3-14.1 2.2-4 5.1-7.2 8.9-9.3a26 26 0 0 1 13.3-3.4c5 0 9.5 1.1 13.3 3.4a22 22 0 0 1 8.7 9.3c2.1 4 3.2 8.6 3.2 14 0 5.5-1 10.2-3.2 14.2-2 4-5 7.2-8.7 9.4a26 26 0 0 1-13.3 3.3Zm0-10c4 0 7-1.5 9.1-4.4 2.2-3 3.3-7.1 3.3-12.4 0-5.3-1-9.4-3.3-12.3-2-3-5.1-4.5-9-4.5-4 0-7.1 1.5-9.3 4.5-2.2 3-3.3 7-3.3 12.3 0 5.3 1.1 9.4 3.3 12.4 2.2 2.9 5.3 4.4 9.2 4.4ZM2141.1 1598.2c-3.5 0-6.7-.8-9.4-2.4a16 16 0 0 1-6.1-6.4l-.3 7.6h-11.7v-68.2h12.3v24.2c1.4-2.3 3.4-4.3 6-6 2.6-1.6 5.7-2.4 9.2-2.4 4.5 0 8.3 1.1 11.5 3.4 3.2 2.1 5.7 5.2 7.4 9.3a34 34 0 0 1 2.7 14c0 5.5-.9 10.3-2.7 14.3-1.7 4-4.2 7-7.4 9.3-3.3 2.2-7 3.3-11.5 3.3Zm-2.8-10c3.6 0 6.4-1.5 8.5-4.4 2.1-3 3.2-7.2 3.2-12.4 0-5.3-1-9.5-3.2-12.4-2-3-4.8-4.4-8.4-4.4-2.6 0-4.8.6-6.8 2a12.3 12.3 0 0 0-4.3 5.7c-1 2.5-1.4 5.5-1.4 9s.4 6.5 1.4 9.1a13 13 0 0 0 4.3 5.8c1.9 1.3 4.1 2 6.8 2ZM2189.2 1598.2c-5.2 0-9.3-1.7-12.4-5.1a21 21 0 0 1-4.5-14.3v-33h12.3v29.9c0 4.3.7 7.5 2 9.5 1.5 2 3.8 3 6.7 3 3.3 0 5.9-1.1 7.7-3.3 1.8-2.2 2.8-5.5 2.8-9.7v-29.5h12.2v51.3h-11.2l-.3-14.1 1.6.5c-.8 4.8-2.6 8.5-5.5 11a16.8 16.8 0 0 1-11.4 3.8ZM2228.6 1597v-51.3h12.3v51.3h-12.3ZM2266 1597c-3.7 0-6.7-1-9-2.9-2.2-1.9-3.3-5-3.3-9.2v-56h12.3v54.8c0 1.2.3 2.2 1 2.8.7.7 1.7 1 2.9 1h3.7v9.5h-7.6ZM2299.7 1598.2c-4.3 0-8.1-1.1-11.3-3.3a21 21 0 0 1-7.3-9.3c-1.7-4-2.6-8.8-2.6-14.2 0-5.5.9-10.2 2.6-14.2 1.7-4 4.2-7.2 7.4-9.4 3.2-2.1 7-3.2 11.2-3.2 3.6 0 6.7.7 9.4 2.2 2.8 1.5 4.9 3.5 6.3 6.2v-24.2h12.3v68.2h-11.8l-.2-7.6a15 15 0 0 1-6.4 6.4c-2.8 1.6-6 2.4-9.6 2.4Zm3.8-10c2.5 0 4.7-.7 6.4-2 1.8-1.2 3.1-3.1 4-5.6 1-2.6 1.5-5.6 1.5-9.2 0-3.7-.5-6.8-1.5-9.2-.9-2.5-2.2-4.4-4-5.7-1.7-1.3-3.9-2-6.4-2-3.7 0-6.7 1.6-9 4.6-2.1 3-3.2 7-3.2 12.3 0 5 1 9.2 3.2 12.3 2.3 3 5.3 4.5 9 4.5ZM2361 1598.2c-5 0-9.3-.8-12.8-2.3a17.5 17.5 0 0 1-11-15l12.6-.6a9.8 9.8 0 0 0 3.3 6.2c1.8 1.5 4.5 2.3 8 2.3 2.9 0 5.1-.5 6.7-1.4 1.7-1 2.5-2.4 2.5-4.4 0-1.2-.3-2.1-.9-2.9a7 7 0 0 0-3.2-2c-1.6-.6-4-1.2-7.1-1.7-5.3-1-9.4-2-12.4-3.3-3-1.3-5.1-3-6.4-5-1.3-2-1.9-4.4-1.9-7.4 0-4.8 1.9-8.7 5.5-11.6 3.7-3 9.1-4.5 16.2-4.5 4.7 0 8.5.8 11.7 2.3 3 1.5 5.5 3.5 7.3 6.1 1.7 2.6 2.9 5.5 3.3 8.9l-12.4.5c-.3-1.7-.9-3.2-1.7-4.5-.8-1.3-2-2.2-3.4-2.9-1.4-.7-3-1-5-1-2.8 0-5 .6-6.5 1.7a5.6 5.6 0 0 0-2.2 4.6c0 1.4.3 2.5 1 3.4.7.9 1.8 1.6 3.3 2.2 1.6.5 3.6 1 6.2 1.4 5.4.9 9.6 2 12.7 3.3 3 1.3 5.3 3 6.6 5 1.3 2 2 4.4 2 7.2 0 3.3-1 6-2.8 8.4-1.8 2.3-4.3 4-7.7 5.2a34.7 34.7 0 0 1-11.5 1.8Z"
                />
                <mask
                  id="mask0_3180_3"
                  style={{ maskType: "alpha" }}
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="1522"
                  width="1575"
                  height="53"
                >
                  <rect
                    y="1522"
                    width="1575"
                    height="53"
                    fill="url(#paint0_linear_3180_3)"
                  />
                </mask>
                <g
                  mask="url(#mask0_3180_3)"
                  className="construct construct--horizontal"
                >
                  <path
                    className="cross"
                    d="M1525.52 1555.24V1545.73H1559.41V1555.24H1525.52Z"
                    fill="currentColor"
                  />
                  <g className="claw claw--horizontal">
                    <path
                      d="M1530.5 1542.2L1515.5 1535.7L1499.25 1542.95"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M1530.5 1558.7L1515.5 1565.2L1499.25 1557.95"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="1501.5"
                      cy="1550.7"
                      r="9"
                      transform="rotate(-90 1501.5 1550.7)"
                      fill="#D9D9D9"
                      stroke="currentColor"
                      strokeWidth="5"
                    />
                    <line
                      x1="1494"
                      y1="1550.5"
                      x2="2.18557e-07"
                      y2="1550.5"
                      stroke="currentColor"
                      strokeWidth="5"
                    />
                  </g>
                </g>
                <mask
                  id="mask1_3180_3"
                  style={{ maskType: "alpha" }}
                  maskUnits="userSpaceOnUse"
                  x="2203"
                  y="0"
                  width="67"
                  height="1545"
                >
                  <rect
                    x="2203"
                    width="67"
                    height="1545"
                    fill="url(#paint1_linear_3180_3)"
                  />
                </mask>
                <g
                  mask="url(#mask1_3180_3)"
                  className="construct construct--vertical"
                >
                  <path
                    className="dot"
                    d="M2228.42 1538.92V1527.98H2241.19V1538.92H2228.42Z"
                    fill="currentColor"
                  />
                  <g className="claw claw--vertical">
                    <path
                      d="M2243 1533.5L2249.5 1518.5L2242.25 1502.25"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M2226.5 1533.5L2220 1518.5L2227.25 1502.25"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="2234.5"
                      cy="1504.5"
                      r="9"
                      fill="#D9D9D9"
                      stroke="currentColor"
                      strokeWidth="5"
                    />
                    <line
                      x1="2234.5"
                      y1="1494"
                      x2="2234.5"
                      y2="-2.98121e-08"
                      stroke="currentColor"
                      strokeWidth="5"
                    />
                  </g>
                </g>
                <rect
                  x="2387"
                  y="1585"
                  width="13"
                  height="12"
                  fill="currentColor"
                />
                <defs>
                  <linearGradient
                    id="paint0_linear_3180_3"
                    x1="0"
                    y1="1548.5"
                    x2="1575"
                    y2="1548.5"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="white" stopOpacity="0" />
                    <stop offset="0.255" />
                    <stop offset="1" />
                  </linearGradient>
                  <linearGradient
                    id="paint1_linear_3180_3"
                    x1="2236.5"
                    y1="0"
                    x2="2236.5"
                    y2="1545"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="white" stopOpacity="0" />
                    <stop offset="0.245" />
                    <stop offset="1" />
                  </linearGradient>
                </defs>
              </svg>
              <p className="fluid">Dheer Jain, Game Developer</p>
            </header>
          </main>

          <Draggable bounds={"html"}>
            <div
              tabIndex={0}
              className="terminalWindow"
              onKeyDown={onKeyDown}
              ref={containerRef}
              aria-label="Terminal interface"
              style={{ position: "relative", cursor: "move" }}
            >
              <div className="scanlines"></div>
              <div className="fakeMenu">
                <div className="fakeButtons fakeClose"></div>
                <div className="fakeButtons fakeMinimize"></div>
                <div className="fakeButtons fakeZoom"></div>
              </div>

              <div className="fakeScreen" aria-live="polite">
                {dialogData.slice(0, stepIndex).map((d, i) => (
                  <p
                    key={i}
                    dangerouslySetInnerHTML={{
                      __html: `~ ${parseMessage(d.message)}`,
                    }}
                  />
                ))}

                {currentDialog && (
                  <>
                    <p
                      className="line"
                      dangerouslySetInnerHTML={{
                        __html: `~ ${parseMessage(currentDialog.message)}`,
                      }}
                    />
                    {currentDialog.expects_input && (
                      <p className="line">
                        <span className="promptArrow">&gt;</span>
                        {inputText}
                        <span className="cursor" />
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </Draggable>
        </>
      )}

      {step === "loading" && <Loader progress={progress} />}

      {step === "experience" && (
        <Suspense fallback={null}>
          <Experience scene={scene} />
        </Suspense>
      )}
    </>
  );
}
