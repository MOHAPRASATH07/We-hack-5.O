/*
 * Quiet Command design reminder: permission is staged, sensor activity is explicit,
 * and unsupported hardware is visible rather than silently simulated.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { SensorSignal } from "@/lib/emergency";

export type SensorBundle = {
  camera: SensorSignal;
  microphone: SensorSignal;
  motion: SensorSignal;
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraOn: boolean;
  micOn: boolean;
  motionOn: boolean;
  modelLoading: boolean;
  modelReady: boolean;
  cameraError: string | null;
  micError: string | null;
  motionError: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  startMicrophone: () => Promise<void>;
  stopMicrophone: () => void;
  enableMotion: () => Promise<void>;
  stopMotion: () => void;
}

const unavailable = (id: SensorSignal["id"], label: string, detail: string): SensorSignal => ({
  id,
  label,
  status: "unavailable",
  value: "Unavailable",
  confidence: 0,
  source: "Browser capability",
  observedAt: null,
  detail,
});

export function useEmergencySensors(): SensorBundle {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const modelRef = useRef<{ detect: (input: HTMLVideoElement) => Promise<Array<{ class: string; score: number }>> } | null>(null);
  const animationRef = useRef<number | null>(null);
  const micAnimationRef = useRef<number | null>(null);
  const motionListenerRef = useRef<((event: DeviceMotionEvent) => void) | null>(null);
  const motionTimerRef = useRef<number | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [motionOn, setMotionOn] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [motionError, setMotionError] = useState<string | null>(null);
  const [camera, setCamera] = useState<SensorSignal>(unavailable("camera", "Vision model", "Camera is off. Start it to inspect frames locally."));
  const [microphone, setMicrophone] = useState<SensorSignal>(unavailable("microphone", "Microphone", "Microphone is off. Start it to measure local audio energy."));
  const [motion, setMotion] = useState<SensorSignal>(unavailable("motion", "Motion sensor", "Motion is off. Enable it from a button press."));

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser does not expose camera access.");
      setCamera(unavailable("camera", "Vision model", "Camera access is unavailable in this browser."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setCamera({ id: "camera", label: "Vision model", status: "active", value: "Camera live", confidence: 0.96, source: "Phone camera", observedAt: Date.now(), detail: "Frame stream is local. The model reports people; smoke remains an operator-confirmed cue unless a smoke model is installed." });

      setModelLoading(true);
      try {
        const [tf, modelLib] = await Promise.all([import("@tensorflow/tfjs"), import("@tensorflow-models/coco-ssd")]);
        await tf.ready();
        if (!modelRef.current) modelRef.current = await modelLib.load({ base: "lite_mobilenet_v2" });
        setModelReady(true);
      } catch {
        setModelReady(false);
      } finally {
        setModelLoading(false);
      }
    } catch (error) {
      const message = error instanceof DOMException && error.name === "NotAllowedError" ? "Camera permission was denied. You can continue with motion and microphone." : "Camera could not be opened on this device.";
      setCameraError(message);
      setCamera(unavailable("camera", "Vision model", message));
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setCamera(unavailable("camera", "Vision model", "Camera is off. No frames are being captured."));
  }, []);

  useEffect(() => {
    if (!cameraOn || !modelReady || !modelRef.current) return;
    let cancelled = false;
    const inspectFrame = async () => {
      if (cancelled || !videoRef.current || videoRef.current.readyState < 2 || !modelRef.current) return;
      try {
        const predictions = await modelRef.current.detect(videoRef.current);
        const people = predictions.filter((prediction) => prediction.class === "person" && prediction.score >= 0.55);
        if (people.length) {
          setCamera((current) => ({ ...current, status: "active", value: `${people.length} person${people.length > 1 ? "s" : ""} detected`, numericValue: people.length, confidence: Math.min(0.99, Math.max(...people.map((person) => person.score))), source: "COCO-SSD · local browser model", observedAt: Date.now(), detail: "Real on-device person detection. This is a presence cue, not a smoke detector." }));
        } else {
          setCamera((current) => ({ ...current, status: "active", value: "No person in frame", numericValue: 0, confidence: 0.72, source: "COCO-SSD · local browser model", observedAt: Date.now(), detail: "Real on-device scan; no person class above threshold in the latest frame." }));
        }
      } catch {
        // Keep the real camera stream visible even if an individual inference frame fails.
      }
      if (!cancelled) animationRef.current = requestAnimationFrame(inspectFrame);
    };
    animationRef.current = requestAnimationFrame(inspectFrame);
    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [cameraOn, modelReady]);

  const startMicrophone = useCallback(async () => {
    setMicError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("This browser does not expose microphone access.");
      setMicrophone(unavailable("microphone", "Microphone", "Microphone access is unavailable in this browser."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      micStreamRef.current = stream;
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      micContextRef.current = context;
      micAnalyserRef.current = analyser;
      setMicOn(true);
      const measure = () => {
        const currentAnalyser = micAnalyserRef.current;
        if (!currentAnalyser) return;
        const data = new Uint8Array(currentAnalyser.fftSize);
        currentAnalyser.getByteTimeDomainData(data);
        const rms = Math.sqrt(data.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / data.length);
        setMicrophone({ id: "microphone", label: "Microphone", status: rms >= 0.12 ? "active" : "ready", value: `${rms.toFixed(2)} RMS`, numericValue: rms, confidence: 0.78, source: "Phone microphone", observedAt: Date.now(), detail: "Real-time audio energy only. This build does not claim to classify alarms or distress speech." });
        micAnimationRef.current = requestAnimationFrame(measure);
      };
      measure();
    } catch (error) {
      const message = error instanceof DOMException && error.name === "NotAllowedError" ? "Microphone permission was denied." : "Microphone could not be opened on this device.";
      setMicError(message);
      setMicrophone(unavailable("microphone", "Microphone", message));
    }
  }, []);

  const stopMicrophone = useCallback(() => {
    if (micAnimationRef.current) cancelAnimationFrame(micAnimationRef.current);
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    micContextRef.current?.close();
    micContextRef.current = null;
    micAnalyserRef.current = null;
    setMicOn(false);
    setMicrophone(unavailable("microphone", "Microphone", "Microphone is off. No audio is being captured."));
  }, []);

  const stopMotion = useCallback(() => {
    if (motionListenerRef.current) window.removeEventListener("devicemotion", motionListenerRef.current);
    if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current);
    motionListenerRef.current = null;
    motionTimerRef.current = null;
    setMotionOn(false);
    setMotion(unavailable("motion", "Motion sensor", "Motion sensing is off."));
  }, []);

  const enableMotion = useCallback(async () => {
    setMotionError(null);
    if (!("DeviceMotionEvent" in window)) {
      setMotionError("This browser does not expose device motion.");
      setMotion(unavailable("motion", "Motion sensor", "DeviceMotionEvent is not available."));
      return;
    }
    try {
      const MotionEvent = DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<PermissionState> };
      if (typeof MotionEvent.requestPermission === "function") {
        const permission = await MotionEvent.requestPermission();
        if (permission !== "granted") throw new Error("Motion permission was denied.");
      }
      const handler = (event: DeviceMotionEvent) => {
        const acceleration = event.accelerationIncludingGravity;
        if (!acceleration) return;
        const magnitude = Math.sqrt((acceleration.x ?? 0) ** 2 + (acceleration.y ?? 0) ** 2 + (acceleration.z ?? 0) ** 2);
        const spike = magnitude >= 18 || magnitude <= 2;
        setMotion({ id: "motion", label: "Motion sensor", status: spike ? "active" : "ready", value: `${magnitude.toFixed(1)} m/s²`, numericValue: magnitude >= 9.81 ? Math.abs(magnitude - 9.81) : 9.81 - magnitude, confidence: 0.86, source: "DeviceMotionEvent", observedAt: Date.now(), detail: spike ? "Real acceleration spike detected. It is a motion cue, not a medical fall diagnosis." : "Real accelerometer stream within the current baseline." });
        if (spike) {
          if (motionTimerRef.current) window.clearTimeout(motionTimerRef.current);
          motionTimerRef.current = window.setTimeout(() => setMotion((current) => ({ ...current, status: "ready", detail: "Spike window ended; monitoring continues." })), 2500);
        }
      };
      motionListenerRef.current = handler;
      window.addEventListener("devicemotion", handler);
      setMotionOn(true);
      setMotion({ id: "motion", label: "Motion sensor", status: "active", value: "Listening", confidence: 0.86, source: "DeviceMotionEvent", observedAt: Date.now(), detail: "Motion permission granted. Hold or move the phone to generate real readings." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Motion permission was denied.";
      setMotionError(message);
      setMotion(unavailable("motion", "Motion sensor", message));
    }
  }, []);

  useEffect(() => () => {
    stopCamera();
    stopMicrophone();
    stopMotion();
  }, [stopCamera, stopMicrophone, stopMotion]);

  return { camera, microphone, motion, videoRef, cameraOn, micOn, motionOn, modelLoading, modelReady, cameraError, micError, motionError, startCamera, stopCamera, startMicrophone, stopMicrophone, enableMotion, stopMotion };
}
