'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Smartphone,
  Share2,
  Copy,
  Check,
  Download,
  QrCode,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { formatGameNativeExport, downloadConfigJson } from '@/lib/api';
import type { CompatibilityRun } from '@/lib/types';

interface SendToPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: CompatibilityRun | null;
  gameName?: string;
}

export default function SendToPhoneModal({
  isOpen,
  onClose,
  run,
  gameName,
}: SendToPhoneModalProps) {
  const [qrMode, setQrMode] = useState<'url' | 'json'>('url');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Compute shareable URL
  const gId = run?.game?.id ?? run?.gameId ?? '';
  const effectiveGameName =
    gameName || run?.game?.name || run?.gameName || (gId ? `Game #${gId}` : 'GameNative Game');

  const shareUrl = typeof window !== 'undefined' && run
    ? `${window.location.origin}${window.location.pathname}?game=${gId}&run=${run.id}`
    : '';

  // Check Web Share API capability
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanShare(true);
    }
  }, []);

  // Generate QR Code whenever mode or run changes
  useEffect(() => {
    if (!isOpen || !run) return;

    let cancelled = false;
    async function generateQR() {
      try {
        let payload = shareUrl;
        if (qrMode === 'json') {
          const exportData = formatGameNativeExport(run!, effectiveGameName);
          payload = JSON.stringify(exportData);
        }

        const dataUrl = await QRCode.toDataURL(payload, {
          width: 320,
          margin: 2,
          color: {
            dark: '#06b6d4', // Cyan QR modules
            light: '#0f172a', // Slate dark background
          },
          errorCorrectionLevel: qrMode === 'json' ? 'L' : 'M',
        });

        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    }

    generateQR();
    return () => {
      cancelled = true;
    };
  }, [isOpen, run, qrMode, shareUrl, effectiveGameName]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !run) return null;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyJson = () => {
    if (typeof navigator !== 'undefined') {
      const exportData = formatGameNativeExport(run, effectiveGameName);
      navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;

    const exportData = formatGameNativeExport(run, effectiveGameName);
    try {
      // Try sharing as a downloadable JSON file if supported
      const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const fileName = `${effectiveGameName.replace(/[^a-zA-Z0-9_-]/g, '_')}_config.json`;
      const file = new File([jsonBlob], fileName, { type: 'application/json' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${effectiveGameName} GameNative Config`,
          text: `Configuration for ${effectiveGameName} (${run.avgFps ? `${run.avgFps} FPS, ` : ''}${run.device?.gpu || 'Android'})`,
          files: [file],
        });
      } else {
        await navigator.share({
          title: `${effectiveGameName} GameNative Config`,
          text: `Check out this GameNative config for ${effectiveGameName}:`,
          url: shareUrl,
        });
      }
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error('Error sharing:', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col space-y-5 text-gray-100 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-800/50 rounded-xl text-cyan-400">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                Send to Android Phone
              </h3>
              <p className="text-xs text-gray-400 truncate max-w-[280px]">
                {effectiveGameName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Game & Hardware Summary Pill */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-800/60 rounded-xl border border-gray-800 text-xs">
          <span className="font-semibold text-cyan-300 truncate">
            {run.device?.model || 'Android Device'}
          </span>
          {run.device?.gpu && (
            <span className="bg-gray-900 px-2 py-0.5 rounded text-gray-300 font-mono border border-gray-700">
              {run.device.gpu}
            </span>
          )}
          {run.avgFps != null && (
            <span className="bg-cyan-950 px-2 py-0.5 rounded text-cyan-300 font-mono font-semibold flex items-center gap-1 border border-cyan-800/50">
              <Zap className="h-3 w-3" />
              {run.avgFps} FPS
            </span>
          )}
          <span className="text-amber-400 ml-auto font-semibold">
            ★ {run.rating}/5
          </span>
        </div>

        {/* QR Mode Selector */}
        <div className="flex rounded-xl bg-gray-800/80 p-1 border border-gray-700/60 text-xs">
          <button
            onClick={() => setQrMode('url')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
              qrMode === 'url'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open on Phone (URL)
          </button>
          <button
            onClick={() => setQrMode('json')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
              qrMode === 'json'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            Scan JSON Directly
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-950/70 rounded-2xl border border-gray-800 shadow-inner">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Scan QR to open on phone"
              className="w-56 h-56 rounded-xl border border-cyan-900/50 shadow-lg"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-cyan-400">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3 text-center max-w-xs">
            {qrMode === 'url' ? (
              <>
                Scan with your Android camera or Google Lens to view and download this config directly on your device.
              </>
            ) : (
              <>
                Scan with a QR reader to decode the raw GameNative container JSON configuration.
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {canShare && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-600/20"
            >
              <Share2 className="h-4 w-4" />
              {shareSuccess ? 'Shared Successfully!' : 'Share via Android Sheet...'}
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl border border-gray-700 transition flex items-center justify-center gap-2"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  Copied URL!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Share Link
                </>
              )}
            </button>

            <button
              onClick={handleCopyJson}
              className="py-2.5 px-3 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl border border-gray-700 transition flex items-center justify-center gap-2"
            >
              {copiedJson ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  Copied JSON!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Raw JSON
                </>
              )}
            </button>
          </div>

          <button
            onClick={() => downloadConfigJson(run, effectiveGameName)}
            className="w-full py-2 px-3 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download config.json Directly
          </button>
        </div>
      </div>
    </div>
  );
}
