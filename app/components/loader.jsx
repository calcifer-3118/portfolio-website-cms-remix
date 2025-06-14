import { useEffect, useState, useRef } from "react";

export default function Loader({ progress }) {
  const bootVoice = useRef(null);
  const canvasRef = useRef(null);
  const [bootIndex, setBootIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const glitchSoundRef = useRef(null);

  const bootMessages = [
    "Initializing virtual environment...",
    "Decrypting workspace modules...",
    "Establishing GPU uplink...",
    "Syncing neural interface...",
    "Booting system services...",
    "Injecting shaders...",
    "Preparing sensory layers...",
    "Activating memory sectors...",
    "Loading Your Experience...",
  ];

  const bootMessage =
    bootMessages[bootIndex] || bootMessages[bootMessages.length - 1];

  function makeDistortionCurve(amount = 50) {
    const k = typeof amount === "number" ? amount : 50,
      n_samples = 44100,
      curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  useEffect(() => {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const gainNode = audioContext.createGain();
    const distortion = audioContext.createWaveShaper();
    let source = null;

    // Load boot-voice
    fetch("/sounds/boot-voice.mp3")
      .then((res) => res.arrayBuffer())
      .then((data) => audioContext.decodeAudioData(data))
      .then((buffer) => {
        source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = false;

        gainNode.gain.value = 0.7;

        source.connect(distortion);
        distortion.connect(gainNode);
        gainNode.connect(audioContext.destination);

        source.start(0);

        bootVoice.current = { distortion, gainNode, source, audioContext };
      });

    // Load glitch sound separately
    fetch("/sounds/glitch-sounds-26212.mp3")
      .then((res) => res.arrayBuffer())
      .then((data) => audioContext.decodeAudioData(data))
      .then((buffer) => {
        glitchSoundRef.current = buffer;
      });

    return () => {
      try {
        if (source) source.stop();
      } catch (e) {
        console.warn("Audio already stopped or not started.");
      }
      audioContext.close();
    };
  }, []);

  useEffect(() => {
    let glitchSource = null;

    const glitchTimer = setInterval(async () => {
      const shouldGlitch = Math.random() > 0.6;

      if (
        shouldGlitch &&
        glitchSoundRef.current &&
        bootVoice.current?.audioContext
      ) {
        const ctx = bootVoice.current.audioContext;

        // ⚠️ Ensure context is resumed (required on some browsers)
        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        console.log("⚡ Glitch starting...");

        setIsGlitching(true);

        // Create glitch audio source
        glitchSource = ctx.createBufferSource();
        glitchSource.buffer = glitchSoundRef.current;

        const glitchGain = ctx.createGain();
        glitchGain.gain.value = 0.05 + Math.random() * 0.05;

        glitchSource.connect(glitchGain);
        glitchGain.connect(ctx.destination);

        const duration = glitchSoundRef.current.duration;
        const randomOffset = Math.max(
          0,
          Math.min(duration - 0.5, Math.random() * duration)
        );
        console.log("🎧 Playing glitch at offset:", randomOffset.toFixed(2));

        try {
          glitchSource.start(0, randomOffset);
        } catch (e) {
          console.warn("Failed to start glitch sound:", e);
        }

        glitchSource.stop(ctx.currentTime + 0.7);

        glitchSource.onended = () => {
          console.log("🛑 Glitch sound ended.");
          try {
            glitchSource.disconnect();
            glitchGain.disconnect();
          } catch {}
        };

        // Add distortion
        if (bootVoice.current.distortion) {
          bootVoice.current.distortion.curve = makeDistortionCurve(800);
        }

        setTimeout(() => {
          setIsGlitching(false);

          if (bootVoice.current.distortion) {
            bootVoice.current.distortion.curve = null;
          }
        }, 700);
      }
    }, 2000);

    return () => {
      clearInterval(glitchTimer);
      if (glitchSource) {
        try {
          glitchSource.stop();
          glitchSource.disconnect();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    const glitchTimer = setInterval(() => {
      const shouldGlitch = Math.random() > 0.5; // ~50% chance to glitch
      if (shouldGlitch) {
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), 1000); // glitch lasts for 1s
      }
    }, 1500); // check every 1.5s

    return () => clearInterval(glitchTimer);
  }, []);

  useEffect(() => {
    if (bootIndex < bootMessages.length - 1) {
      const interval = setInterval(() => {
        setBootIndex((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [bootIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);
    const chars =
      "アァイィウヴエェオカガキギクグケゲコゴサザシジスズセゼソゾタダチッヂヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    function draw() {
      ctx.fillStyle = "rgba(18, 18, 18, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    }

    const interval = setInterval(draw, 33);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 z-50 bg-[#121212] flex flex-col justify-center items-center font-mono text-white overflow-hidden">
      {/* Matrix Rain Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-30" />

      {/* ZONE: Bottom-right Glitch Stream */}
      <div className="absolute bottom-12 right-4 text-green-300 font-mono text-[10px] opacity-10 text-right leading-4 space-y-[2px]">
        {Array.from({ length: 8 }).map((_, i) => {
          const line = Array.from({
            length: Math.floor(Math.random() * 6 + 3),
          })
            .map(() => Math.random().toString(36).slice(2, 4).toUpperCase())
            .join(" ");
          return <div key={i}>{line}</div>;
        })}
      </div>

      {/* ZONE: Top-left Noise Flicker */}
      <div className="absolute top-4 left-4 text-white font-mono text-[10px] opacity-10 leading-3 space-y-[1px] animate-hacker-flicker">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            {Array.from({ length: 15 })
              .map(
                () =>
                  "█ ░ ▌ ▓ ▒ ▄ ▀ ▀ ▐".split(" ")[Math.floor(Math.random() * 9)]
              )
              .join("")}
          </div>
        ))}
      </div>

      {/* ZONE: Bottom-right Status Box */}
      <div className="absolute bottom-6 right-6 text-slate-400 font-mono text-xs text-right leading-tight">
        <div>SESSION: 0x7FF2-92AB</div>
        <div>HOST: CALCIFER_CORE</div>
        <div>MODE: IMMERSIVE</div>
        <div>GRAPHICS: QUANTUM MAPPED</div>
        <div>STATUS: LOADING</div>
      </div>

      {/* Terminal UI Content */}
      <div className="relative z-10 text-center">
        <div
          className={`mb-4 text-sm tracking-widest text-slate-400 ${
            isGlitching ? "glitch-text" : ""
          }`}
        >
          <span>{bootMessage}</span>
          <span className="animate-pulse ml-1">|</span>
        </div>

        <div className="relative w-[300px] h-[2px] bg-[#ffffff22] overflow-hidden rounded">
          <div
            className="h-full bg-white animate-scan shadow-[0_0_15px_2px_rgba(255,255,255,0.6)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-md opacity-80 tracking-wider">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
