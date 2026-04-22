'use client';

import { useState } from 'react';
import { Trophy, Check, ChevronLeft } from 'lucide-react';
import type { OnboardingInitialData } from '@/app/(player)/onboarding/page';
import { Step1PersonalData } from './Step1PersonalData';
import { Step2FootballData } from './Step2FootballData';
import { Step3Photo } from './Step3Photo';
import { Step4TournamentSignup } from './Step4TournamentSignup';

type WizardState = {
  firstName: string;
  lastName: string;
  nickname: string;
  dni: string;
  birthDate: string;
  phone: string;
  reference: string;
  position: string;
  foot: string;
  avatarUrl: string | null;
};

const STEP_LABELS = [
  'Datos personales',
  'Datos futbolísticos',
  'Foto de perfil',
  'Inscripción al torneo',
];

type Props = {
  data: OnboardingInitialData;
};

export function OnboardingShell({ data }: Props) {
  // Calcular paso inicial según qué ya está completo
  const initialStep = (() => {
    if (data.registrationStatus === 'pending' || data.registrationStatus === 'waitlist') return 4;
    if (data.player && data.player.first_name && data.player.position) return 3;
    if (data.player && data.player.first_name) return 2;
    return 1;
  })();

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [state, setState] = useState<WizardState>({
    firstName: data.player?.first_name ?? '',
    lastName: data.player?.last_name ?? '',
    nickname: data.player?.nickname ?? '',
    dni: data.player?.dni ?? '',
    birthDate: data.player?.birth_date ?? '',
    phone: data.player?.phone ?? '',
    reference: data.player?.reference ?? '',
    position: data.player?.position ?? '',
    foot: data.player?.foot ?? '',
    avatarUrl: data.player?.avatar_url ?? null,
  });

  const update = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }));

  const goBack = () => setCurrentStep(s => Math.max(1, s - 1));
  const goNext = () => setCurrentStep(s => Math.min(4, s + 1));

  // En el paso 4, si el jugador ya está en pending/waitlist, no permitimos ir atrás
  // porque ya envió la solicitud. No tiene sentido volver a modificar.
  const isTerminal =
    currentStep === 4 &&
    (data.registrationStatus === 'pending' || data.registrationStatus === 'waitlist');

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-900 flex items-center justify-center relative">
            <Trophy className="w-5 h-5 text-white" strokeWidth={2} />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500" />
          </div>
          <div className="font-serif text-lg font-bold text-blue-900">
            Liga<span className="text-orange-500">.</span>9
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-mono tracking-wider">PASO</span>
          <span className="font-serif font-bold text-blue-900 text-lg">{currentStep}</span>
          <span className="font-mono">/</span>
          <span className="font-mono">4</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-8 flex">
          {[1, 2, 3, 4].map(n => {
            const done = n < currentStep;
            const active = n === currentStep;
            return (
              <div
                key={n}
                className="flex-1 py-3 border-t-2"
                style={{
                  borderTopColor: n <= currentStep ? '#1e3a8a' : '#e2e8f0',
                  marginTop: '-1px',
                }}
              >
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className={`w-5 h-5 flex items-center justify-center font-mono font-bold text-[10px] ${
                      done
                        ? 'bg-emerald-600 text-white'
                        : active
                        ? 'bg-blue-900 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {done ? <Check className="w-3 h-3" /> : n}
                  </div>
                  <span className={`font-medium ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                    {STEP_LABELS[n - 1]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-8 py-12">
        <div className="bg-white border border-slate-200 p-8">
          {currentStep === 1 && (
            <Step1PersonalData state={state} update={update} onComplete={goNext} />
          )}
          {currentStep === 2 && (
            <Step2FootballData state={state} update={update} onComplete={goNext} />
          )}
          {currentStep === 3 && (
            <Step3Photo
              state={state}
              update={update}
              userEmail={data.userEmail}
              onComplete={goNext}
            />
          )}
          {currentStep === 4 && (
            <Step4TournamentSignup
              activeTournament={data.activeTournament}
              registrationStatus={data.registrationStatus as any}
              rejectionReason={data.rejectionReason}
            />
          )}
        </div>

        {/* Nav inferior */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={goBack}
            disabled={currentStep === 1 || isTerminal}
            className={`px-5 py-2.5 text-sm font-medium flex items-center gap-2 ${
              currentStep === 1 || isTerminal
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Atrás
          </button>
          <div className="text-xs text-slate-400 font-mono">{data.userEmail}</div>
        </div>
      </div>
    </div>
  );
}
