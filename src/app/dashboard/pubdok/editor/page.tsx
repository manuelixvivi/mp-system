'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { Member } from '@/types';
import {
  Palette,
  Upload,
  Download,
  Save,
  RotateCcw,
  ZoomIn,
  Move,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowLeft,
  Sliders,
  Image as ImageIcon,
} from 'lucide-react';

export default function PubdokEditorPage() {
  const { currentRole } = useRole();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Template Image State
  const [templateUrl, setTemplateUrl] = useState<string>('/templates/birthday_template_sample.jpg');

  // Photo & Transformation State
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);

  // Text & Sticker Overlays State
  const [nameLine1, setNameLine1] = useState<string>('Maria');
  const [nameLine2, setNameLine2] = useState<string>('Godeliva');
  const [handleText, setHandleText] = useState<string>('@mariagodeliva');
  const [dayNumber, setDayNumber] = useState<string>('28');
  const [bibleVerse, setBibleVerse] = useState<string>(
    'Jeremiah 29:11\n"For I know the plans I have for you," declares the LORD, "plans to prosper you and not to harm you, plans to give you hope and a future."'
  );

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const templateImgRef = useRef<HTMLImageElement | null>(null);
  const photoImgRef = useRef<HTMLImageElement | null>(null);

  // Load Members
  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true);
        const res = await fetch('/api/members');
        if (res.ok) {
          const data = await res.json();
          const activeMembers = (data.members || []).filter((m: Member) => m.status === 'active');
          setMembers(activeMembers);

          if (activeMembers.length > 0) {
            selectMember(activeMembers[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching members:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, []);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Select Member and Populate Form
  const selectMember = (m: Member) => {
    setSelectedMember(m);
    const parts = (m.full_name || '').trim().split(/\s+/);
    if (parts.length === 1) {
      setNameLine1(parts[0]);
      setNameLine2('');
    } else {
      setNameLine1(parts[0]);
      setNameLine2(parts.slice(1).join(' '));
    }

    const rawHandle = m.line_id || m.instagram_account || m.nickname || parts[0];
    setHandleText(rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`);
    setDayNumber(m.birth_date ? `${m.birth_date}` : '1');

    if (m.photo_url) {
      setPhotoUrl(m.photo_url);
    } else {
      setPhotoUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop');
    }

    // Reset transformations
    setZoom(1.0);
    setOffsetX(0);
    setOffsetY(0);
    setRotation(0);
  };

  // Load Template Image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = templateUrl;
    img.onload = () => {
      templateImgRef.current = img;
      drawCanvas();
    };
  }, [templateUrl]);

  // Load Photo Image
  useEffect(() => {
    if (!photoUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photoUrl;
    img.onload = () => {
      photoImgRef.current = img;
      drawCanvas();
    };
  }, [photoUrl]);

  // Redraw when controls change
  useEffect(() => {
    drawCanvas();
  }, [zoom, offsetX, offsetY, rotation, nameLine1, nameLine2, handleText, dayNumber, bibleVerse]);

  // Canvas Drawing Engine
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions: 540 x 960 (standard 9:16 vertical poster)
    const W = 540;
    const H = 960;
    canvas.width = W;
    canvas.height = H;

    ctx.clearRect(0, 0, W, H);

    // 1. Draw Template Background
    if (templateImgRef.current) {
      ctx.drawImage(templateImgRef.current, 0, 0, W, H);
    } else {
      // Fallback background
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#60A5FA');
      grad.addColorStop(1, '#1E3A8A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Oval Frame Coordinates (matching calendar template)
    const ovalX = 270;
    const ovalY = 445;
    const radiusX = 162;
    const radiusY = 212;

    // 2. Draw Member Photo Masked inside Oval Frame
    if (photoImgRef.current) {
      ctx.save();

      // Create Oval Mask
      ctx.beginPath();
      ctx.ellipse(ovalX, ovalY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.clip();

      // Transform & Draw Photo
      ctx.translate(ovalX + offsetX, ovalY + offsetY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      const pImg = photoImgRef.current;
      // Draw centered
      const pw = pImg.naturalWidth || 400;
      const ph = pImg.naturalHeight || 400;
      const aspect = pw / ph;
      let drawW = radiusX * 2.2;
      let drawH = drawW / aspect;
      if (drawH < radiusY * 2.2) {
        drawH = radiusY * 2.2;
        drawW = drawH * aspect;
      }

      ctx.drawImage(pImg, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Oval Stroke Border
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ovalX, ovalY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0F172A';
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Handle Text along Oval border (e.g. "@mariagodeliva")
    if (handleText) {
      ctx.save();
      ctx.translate(ovalX - radiusX + 35, ovalY - 50);
      ctx.rotate((-65 * Math.PI) / 180);
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(handleText, 0, 0);
      ctx.restore();
    }

    // 4. Draw Name Stickers (Dark navy angled badges with bold white font)
    if (nameLine1) {
      ctx.save();
      ctx.translate(145, 605);
      ctx.rotate((-4 * Math.PI) / 180);

      ctx.font = '900 28px sans-serif';
      const textW1 = ctx.measureText(nameLine1).width;
      const padX = 14;
      const padY = 8;

      ctx.fillStyle = '#0B132B';
      ctx.fillRect(-padX, -24, textW1 + padX * 2, 38);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(nameLine1, 0, 5);
      ctx.restore();
    }

    if (nameLine2) {
      ctx.save();
      ctx.translate(225, 642);
      ctx.rotate((2 * Math.PI) / 180);

      ctx.font = '900 32px sans-serif';
      const textW2 = ctx.measureText(nameLine2).width;
      const padX = 14;

      ctx.fillStyle = '#0B132B';
      ctx.fillRect(-padX, -26, textW2 + padX * 2, 42);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(nameLine2, 0, 6);
      ctx.restore();
    }

    // 5. Draw Date Circle (e.g. "28")
    if (dayNumber) {
      ctx.save();
      const circleX = 432;
      const circleY = 620;
      const circleR = 34;

      ctx.beginPath();
      ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#0F172A';
      ctx.stroke();

      ctx.font = '900 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(dayNumber, circleX, circleY + 2);
      ctx.restore();
    }

    // 6. Draw Bible Verse at Bottom
    if (bibleVerse) {
      ctx.save();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;

      const lines = bibleVerse.split('\n');
      lines.forEach((l, idx) => {
        ctx.fillText(l.trim(), W / 2, H - 55 + idx * 16);
      });
      ctx.restore();
    }
  };

  // Upload Custom Photo
  const handleUploadCustomPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoUrl(event.target.result as string);
          showNotice('Foto kustom berhasil dimuat ke editor!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload New Template Image
  const handleUploadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTemplateUrl(event.target.result as string);
          showNotice('Template baru berhasil dipasang!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Card Image to Member Profile in Supabase
  const handleSaveCardToMember = async () => {
    if (!selectedMember) {
      showNotice('Pilih anggota terlebih dahulu.', 'error');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);
    try {
      const cardDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedMember.id,
          birthday_card_url: cardDataUrl,
        }),
      });

      if (res.ok) {
        showNotice(`Kartu ultah untuk ${selectedMember.full_name} berhasil disimpan!`);
      } else {
        const err = await res.json();
        showNotice(err.error || 'Gagal menyimpan kartu', 'error');
      }
    } catch (err: any) {
      showNotice(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Download Card as PNG
  const handleDownloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `BirthdayCard_${nameLine1}_${nameLine2 || ''}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showNotice('Kartu ucapan berhasil diunduh!');
  };

  // Filter Members
  const filteredMembers = members.filter(
    (m) =>
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.class_origin && m.class_origin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400 border border-rose-500/30">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Studio Pubdok — Editor Kartu Ulang Tahun</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Kustomisasi posisi foto anggota dan ekspor kartu ultah tahunan MP Community.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadCard}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Unduh PNG</span>
          </button>
          <button
            onClick={handleSaveCardToMember}
            disabled={saving || !selectedMember}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan ke Anggota'}</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Member List & Selector */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Pilih Anggota</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                {filteredMembers.length}
              </span>
            </h3>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama atau kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Members Scrollable List */}
            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredMembers.map((m) => {
                const isSelected = selectedMember?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => selectMember(m)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex items-center space-x-2.5 ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold shadow-sm'
                        : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                      {m.photo_url ? (
                        <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {m.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="truncate flex-1">
                      <div className="truncate">{m.full_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        🎂 {m.birth_date}/{m.birth_month} • {m.class_origin || 'Umum'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Column: Live Canvas Preview */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="bg-slate-900 p-4 rounded-3xl shadow-2xl border border-slate-800 flex flex-col items-center">
            <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>CANVAS PREVIEW (540 × 960)</span>
            </div>

            {/* Canvas Element with responsive scaling */}
            <div className="relative rounded-2xl overflow-hidden shadow-inner border border-slate-700 w-[300px] h-[533px] sm:w-[360px] sm:h-[640px]">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
              />
            </div>

            <div className="mt-3 text-[10px] text-slate-400 text-center">
              💡 Geser slider di sebelah kanan untuk memperbesar atau menggeser posisi foto di dalam oval.
            </div>
          </div>
        </div>

        {/* Right Column: Pubdok Photo Positioning & Customization Controls */}
        <div className="lg:col-span-4 space-y-4">
          {/* Controls Box 1: Photo Positioning */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Move className="w-4 h-4 text-indigo-600" />
                <span>Posisi & Ukuran Foto</span>
              </h3>
              <button
                onClick={() => {
                  setZoom(1.0);
                  setOffsetX(0);
                  setOffsetY(0);
                  setRotation(0);
                }}
                className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center space-x-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Zoom Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 font-semibold">
                <span className="flex items-center space-x-1">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Zoom / Skala</span>
                </span>
                <span className="font-mono text-indigo-600">{zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.02"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Horizontal Position (X) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 font-semibold">
                <span>Posisi Horizontal (X)</span>
                <span className="font-mono text-indigo-600">{offsetX}px</span>
              </div>
              <input
                type="range"
                min="-200"
                max="200"
                step="2"
                value={offsetX}
                onChange={(e) => setOffsetX(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Vertical Position (Y) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 font-semibold">
                <span>Posisi Vertikal (Y)</span>
                <span className="font-mono text-indigo-600">{offsetY}px</span>
              </div>
              <input
                type="range"
                min="-200"
                max="200"
                step="2"
                value={offsetY}
                onChange={(e) => setOffsetY(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Rotation Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 font-semibold">
                <span>Rotasi Sudut</span>
                <span className="font-mono text-indigo-600">{rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="2"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Custom Photo Upload Button */}
            <div className="pt-2">
              <label className="flex items-center justify-center space-x-2 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>Ganti Foto Anggota Ini</span>
                <input type="file" accept="image/*" onChange={handleUploadCustomPhoto} className="hidden" />
              </label>
            </div>
          </div>

          {/* Controls Box 2: Text & Sticker Customization */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Teks & Stiker Nama</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Nama Baris 1</label>
                <input
                  type="text"
                  value={nameLine1}
                  onChange={(e) => setNameLine1(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Nama Baris 2</label>
                <input
                  type="text"
                  value={nameLine2}
                  onChange={(e) => setNameLine2(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">ID / Handle</label>
                <input
                  type="text"
                  value={handleText}
                  onChange={(e) => setHandleText(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Lingkaran Tgl</label>
                <input
                  type="text"
                  value={dayNumber}
                  onChange={(e) => setDayNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Template Annual Upload Button */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center justify-center space-x-2 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 cursor-pointer transition">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Upload Template Desain Baru (Tahunan)</span>
                <input type="file" accept="image/*" onChange={handleUploadTemplate} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
