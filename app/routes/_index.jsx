import { lazy, Suspense, useEffect, useState, useRef } from "react";
import { json, useLoaderData } from "@remix-run/react";
import { createClient } from "../../utils/supabase.server";
import Loader from "../components/loader";

const Experience = lazy(() => import("../components/experience"));

export const loader = async ({ request }) => {
  const supabase = createClient(request);

  const { data, error } = await supabase
    .from("terminal_dialogs")
    .select("id, message, expects_input, order, variable")
    .order("order", { ascending: true });

  if (error) throw new Error(error.message);

  return json(data);
};

export default function Index() {
  const dialogData = useLoaderData();
  const [stepIndex, setStepIndex] = useState(0);
  const [step, setStep] = useState("input");
  const [inputValues, setInputValues] = useState({});
  const [inputText, setInputText] = useState("");
  const [progress, setProgress] = useState(0);
  const containerRef = useRef(null);
  const currentDialog = dialogData[stepIndex];

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, [stepIndex]);

  useEffect(() => {
    if (step !== "loading") return;
    const controller = new AbortController();

    async function preloadModel(url) {
      const res = await fetch(url, { signal: controller.signal });
      const contentLength = res.headers.get("content-length");
      if (!contentLength || !res.body) {
        await res.arrayBuffer();
        setProgress(100);
        setStep("experience");
        return;
      }
      const total = parseInt(contentLength, 10);
      let loaded = 0;
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        loaded += value.length;
        setProgress(Math.round((loaded / total) * 100));
      }
      setProgress(100);
      setStep("experience");
    }

    preloadModel("/model.glb");
    return () => controller.abort();
  }, [step]);

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
    return msg.replace(
      /\{(\w+)\}/g,
      (_, key) => inputValues[key] || `{${key}}`
    );
  }

  return (
    <>
      <style>{`
        body,html,#root {
          margin:0; padding:0; height:100%;
          background: #272727;
          display: flex; justify-content: center; align-items: center;
          font-family: monospace, monospace;
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
      `}</style>

      {step === "input" && (
        <div
          tabIndex={0}
          className="terminalWindow"
          onKeyDown={onKeyDown}
          ref={containerRef}
          aria-label="Terminal interface"
        >
          <div className="fakeMenu">
            <div className="fakeButtons fakeClose"></div>
            <div className="fakeButtons fakeMinimize"></div>
            <div className="fakeButtons fakeZoom"></div>
          </div>

          <div className="fakeScreen" aria-live="polite">
            {dialogData.slice(0, stepIndex).map((d, i) => (
              <p key={i}>{parseMessage(d.message)}</p>
            ))}

            {currentDialog && (
              <>
                <p className="line">{parseMessage(currentDialog.message)}</p>
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
      )}

      {step === "loading" && <Loader progress={progress} />}

      {step === "experience" && (
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      )}
    </>
  );
}
