'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Member, LineGroup } from '@/types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Gift,
  Users,
  AtSign,
  Info,
} from 'lucide-react';

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export default function BirthdayCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        setMembers(data.members || []);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, []);

  // Calculate calendar days
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sunday

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Birthdays for current month
  const monthBirthdays = members.filter((m) => m.birth_month === currentMonth && m.status === 'active');

  // Selected day birthdays
  const selectedDayBirthdays = monthBirthdays.filter((m) => m.birth_date === selectedDay);

  // Generate mention preview for selected day
  const mentionNames = selectedDayBirthdays.map((m) => `@${m.full_name}`);
  let mentionListStr = '';
  if (mentionNames.length === 1) {
    mentionListStr = mentionNames[0];
  } else if (mentionNames.length === 2) {
    mentionListStr = `${mentionNames[0]} and ${mentionNames[1]}`;
  } else if (mentionNames.length > 2) {
    mentionListStr = `${mentionNames.slice(0, -1).join(', ')} and ${mentionNames[mentionNames.length - 1]}`;
  }

  const generatedPreview =
    selectedDayBirthdays.length > 0
      ? `𝓱𝓪𝓹𝓹𝔂 𝓫𝓲𝓻𝓽𝓱𝓭𝓪𝔂 ${mentionListStr} !\n\nYour birthday is a perfect reminder of this truth—that each day, and especially today, God’s love surrounds you, His grace renews you, and His mercies flow abundantly over your life. No matter what the past year held, His faithfulness has brought you through, and His promises are the foundation for all the joy and blessings awaiting you in the year ahead.\n\n"𝑻𝒉𝒆 𝒔𝒕𝒆𝒂𝒅𝒇𝒂𝒔𝒕 𝒍𝒐𝒗𝒆 𝒐𝒇 𝒕𝒉𝒆 𝑳𝒐𝒓𝒅 𝒏𝒆𝒗𝒆𝒓 𝒄𝒆𝒂𝒔𝒆𝒔; 𝑯𝒊𝒔 𝒎𝒆𝒓𝒄𝒊𝒆𝒔 𝒏𝒆𝒗𝒆𝒓 𝒄𝒐𝒎𝒆 𝒕𝒐 𝒂𝒏 𝒆𝒏𝒅; 𝒕𝒉𝒆𝒚 𝒂𝒓𝒆 𝒏𝒆𝒘 𝒆𝒗𝒆𝒓𝒚 𝒎𝒐𝒓𝒏𝒊𝒏𝒈."\n— 𝙻𝚊𝚖𝚎𝚗𝚝𝚊𝚝𝚒𝚘𝚗𝚜 3:22-23`
      : 'Pilih tanggal pada kalender untuk melihat preview pesan ucapan yang akan dikirim bot.';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-medium inline-flex mb-2">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Kalender Ulang Tahun Interaktif</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Kalender Ulang Tahun Anggota MP</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Visualisasi distribusi ulang tahun per hari, pengelompokan grup, dan simulasi pesan LINE mention otomatis.
          </p>
        </div>

        {/* Month Selector Buttons */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-slate-800 text-sm px-3">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Calendar Grid */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 mb-2">
            <span>Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-20 bg-slate-50/50 rounded-lg border border-transparent"></div>
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dayMembers = monthBirthdays.filter((m) => m.birth_date === day);
              const isSelected = selectedDay === day;
              const hasBirthdays = dayMembers.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-20 p-1.5 text-left rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                      : hasBirthdays
                      ? 'border-blue-200 bg-blue-50/30 hover:border-blue-400'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded-full inline-block ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : hasBirthdays
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    {day}
                  </span>

                  {hasBirthdays && (
                    <div className="overflow-hidden">
                      <span className="text-[10px] font-medium text-blue-700 bg-blue-100/80 px-1 py-0.5 rounded truncate block">
                        🎁 {dayMembers.length} Ultah
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 cols): Selected Date Details & LINE Mention Message Simulation */}
        <div className="lg:col-span-5 space-y-4 flex flex-col">
          {/* Day Details Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Gift className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Tanggal {selectedDay} {MONTH_NAMES[currentMonth - 1]}
                </h3>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                {selectedDayBirthdays.length} Anggota
              </span>
            </div>

            {selectedDayBirthdays.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Tidak ada anggota yang berulang tahun pada tanggal ini.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-medium text-slate-500">Anggota yang Berulang Tahun:</p>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {selectedDayBirthdays.map((m) => (
                    <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-900">{m.full_name}</p>
                        <p className="font-mono text-[10px] text-slate-400">{m.line_user_id || 'Belum ada LINE ID'}</p>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                        Mention Ready
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Generated Message Preview (PRD 5.6) */}
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <span className="text-[10px] font-mono text-emerald-400">LINE Message Preview (textV2)</span>
              <span className="text-[10px] text-slate-400">Pukul 07:00 WIB</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-[11px] font-sans text-slate-200 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
              {generatedPreview}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-emerald-400" />
                <span>Aturan: Max 20 mention/pesan. Tanpa boneka 🧸.</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
