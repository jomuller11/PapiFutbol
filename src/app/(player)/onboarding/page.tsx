'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Trophy, Check, User, Star, CreditCard, Cake, Phone,
  Footprints, Info, Camera, ArrowLeft, ArrowRight, AlertCircle, CircleDashed, Clock
} from 'lucide-react';
import { completePlayerProfile } from '@/lib/actions/players';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';

const POSITIONS: Record<string, string> = {
  ARQ: 'Arquero', DFC: 'Defensor Central', LAT: 'Lateral',
  MCC: 'Mediocampista Central', MCO: 'Mediocampista Ofensivo',
  EXT: 'Extremo', DEL: 'Delantero'
};

const REFERENCES = [
  { value: 'padre_alumno', label: 'Padre de Alumno' },
  { value: 'padre_ex_alumno', label: 'Padre de Ex Alumno' },
  { value: 'ex_alumno', label: 'Ex Alumno' },
  { value: 'docente_colegio', label: 'Docente del Colegio' },
  { value: 'hermano_marista', label: 'Hermano Marista' },
  { value: 'esposo_educadora', label: 'Esposo de Educadora' },
  { value: 'abuelo_alumno', label: 'Abuelo de Alumno' },
  { value: 'invitado', label: 'Invitado' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    dni: '',
    birthDate: '',
    phone: '',
    reference: '',
    position: '',
    foot: '',
    avatarUrl: ''
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const canProceedStep1 = formData.firstName && formData.lastName && formData.dni && formData.birthDate && formData.phone && formData.reference;
  const canProceedStep2 = formData.position && formData.foot;

  const handleNext = () => {
    if (step === 1 && canProceedStep1) setStep(2);
    else if (step === 2 && canProceedStep2) setStep(3);
  };

  const handleSubmit = async () => {
    setError(null);
    setIsUploading(true);

    let finalAvatarUrl = formData.avatarUrl;

    if (avatarFile) {
      const supabase = createClient();
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) {
        setError('Error subiendo foto: ' + uploadError.message);
        setIsUploading(false);
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      finalAvatarUrl = publicUrl;
    }

    setIsUploading(false);

    startTransition(async () => {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      if (finalAvatarUrl) data.set('avatarUrl', finalAvatarUrl);

      const result = await completePlayerProfile(data);
      
      if (!result.success) {
        setError(result.error ?? 'Error completando el perfil');
      } else {
        router.push('/dashboard');
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-blue flex items-center justify-center relative">
            <Trophy className="w-5 h-5 text-white" strokeWidth={2} />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-orange" />
          </div>
          <div className="font-serif text-lg font-bold text-brand-blue">Liga<span className="text-brand-orange">.</span>9</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-mono tracking-wider">PASO</span>
          <span className="font-serif font-bold text-brand-blue text-lg">{step}</span>
          <span className="font-mono">/</span>
          <span className="font-mono">{totalSteps}</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-8 flex">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex-1 py-3 border-t-2 border-transparent" style={{
              borderTopColor: n <= step ? '#1e3a8a' : '#e2e8f0',
              marginTop: '-1px'
            }}>
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-5 h-5 flex items-center justify-center font-mono font-bold text-[10px] ${
                  n < step ? 'bg-emerald-600 text-white' : n === step ? 'bg-brand-blue text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {n < step ? <Check className="w-3 h-3" /> : n}
                </div>
                <span className={`font-medium ${n === step ? 'text-slate-900' : 'text-slate-500'}`}>
                  {n === 1 ? 'Datos personales' : n === 2 ? 'Datos futbolísticos' : 'Foto y confirmación'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-8 py-12">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm p-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 p-8">
          {step === 1 && (
            <>
              <div className="mb-6">
                <div className="font-mono text-[10px] text-brand-orange tracking-widest font-semibold mb-2">PASO 1 DE 3</div>
                <h2 className="font-serif text-2xl font-bold mb-1">Contanos quién sos</h2>
                <p className="text-sm text-slate-500">Estos datos quedan privados, solo el admin puede verlos.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField icon={User} label="Nombre" value={formData.firstName} onChange={(v) => updateForm('firstName', v)} required />
                <FormField icon={User} label="Apellido" value={formData.lastName} onChange={(v) => updateForm('lastName', v)} required />
                <FormField icon={Star} label="Apodo" value={formData.nickname} onChange={(v) => updateForm('nickname', v)} hint="Se muestra en estadísticas públicas" />
                <FormField icon={CreditCard} label="DNI" value={formData.dni} onChange={(v) => updateForm('dni', v)} required />
                <FormField icon={Cake} label="Fecha de nacimiento" type="date" value={formData.birthDate} onChange={(v) => updateForm('birthDate', v)} required />
                <FormField icon={Phone} label="Teléfono" value={formData.phone} onChange={(v) => updateForm('phone', v)} placeholder="+54 9 11 ..." required />
                
                <div className="md:col-span-2">
                  <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
                    Vínculo con el colegio <span className="text-brand-orange">*</span>
                  </label>
                  <Select value={formData.reference} onValueChange={(v) => updateForm('reference', v)}>
                    <SelectTrigger className="w-full bg-white h-[42px] rounded-none border-slate-200 focus:ring-0 focus:border-brand-blue">
                      <SelectValue placeholder="Seleccioná tu vínculo" />
                    </SelectTrigger>
                    <SelectContent>
                      {REFERENCES.map(ref => (
                        <SelectItem key={ref.value} value={ref.value}>{ref.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-6">
                <div className="font-mono text-[10px] text-brand-orange tracking-widest font-semibold mb-2">PASO 2 DE 3</div>
                <h2 className="font-serif text-2xl font-bold mb-1">Tu perfil en la cancha</h2>
                <p className="text-sm text-slate-500">La posición ayuda al admin a armar equipos balanceados.</p>
              </div>

              <div className="mb-6">
                <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-3">
                  Posición preferida <span className="text-brand-orange">*</span>
                </label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {Object.entries(POSITIONS).map(([key, name]) => (
                    <button
                      key={key}
                      onClick={() => updateForm('position', key)}
                      className={`aspect-square flex flex-col items-center justify-center p-2 border transition-all ${
                        formData.position === key ? 'border-brand-orange bg-brand-orange/10 text-orange-900' : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <div className={`font-serif font-bold text-lg ${formData.position === key ? 'text-brand-orange' : 'text-slate-700'}`}>{key}</div>
                      <div className="text-[9px] text-slate-500 text-center leading-tight mt-1">{name.split(' ')[0]}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-3">
                  Pie hábil <span className="text-brand-orange">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {['derecho', 'izquierdo', 'ambidiestro'].map(f => (
                    <button
                      key={f}
                      onClick={() => updateForm('foot', f)}
                      className={`py-3 border text-sm font-medium flex items-center justify-center gap-2 capitalize ${
                        formData.foot === f ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <Footprints className="w-4 h-4" /> {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 p-3 text-xs text-brand-blue">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div>
                  Tu <strong>puntaje</strong> (1-15) lo asigna el administrador después de evaluarte en pruebas. Vas a poder verlo en tu perfil una vez asignado.
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="mb-6">
                <div className="font-mono text-[10px] text-brand-orange tracking-widest font-semibold mb-2">PASO 3 DE 3</div>
                <h2 className="font-serif text-2xl font-bold mb-1">Tu foto de perfil</h2>
                <p className="text-sm text-slate-500">Opcional, pero ayuda a que te reconozcan. Podés cambiarla después.</p>
              </div>

              <div className="flex flex-col items-center py-8">
                <label className="w-36 h-36 border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 mb-4 hover:border-brand-blue hover:text-brand-blue cursor-pointer group relative overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium">Subir foto</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                </label>
                <div className="text-xs text-slate-500 text-center">
                  JPG, PNG o WEBP · Máximo 5MB<br />
                  Recomendado: cuadrada, 400x400px
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 text-xs">
                <div className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold mb-2">Resumen de tu perfil</div>
                <div className="space-y-1 text-slate-700">
                  <div className="flex justify-between"><span className="text-slate-500">Nombre:</span><span className="font-medium">{formData.firstName} {formData.lastName} {formData.nickname && `(${formData.nickname})`}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">DNI:</span><span className="font-mono">{formData.dni}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Teléfono:</span><span className="font-mono">{formData.phone}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Vínculo:</span><span className="font-medium">{REFERENCES.find(r => r.value === formData.reference)?.label}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Posición:</span><span className="font-medium capitalize">{POSITIONS[formData.position]} · Pie {formData.foot}</span></div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : null}
            disabled={step === 1 || isPending || isUploading}
            className={`px-5 py-2.5 text-sm font-medium flex items-center gap-2 ${step === 1 || isPending ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Atrás
          </button>
          
          {step < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
              className={`px-6 py-2.5 text-sm font-medium flex items-center gap-2 ${
                (step === 1 && canProceedStep1) || (step === 2 && canProceedStep2) 
                  ? 'bg-brand-blue text-white hover:bg-brand-blue-dark' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isPending || isUploading}
              className="bg-brand-blue text-white px-6 py-2.5 text-sm font-medium hover:bg-brand-blue-dark flex items-center gap-2"
            >
              {isUploading ? 'Subiendo foto...' : isPending ? 'Guardando...' : 'Guardar y finalizar'}
              {!isUploading && !isPending && <Check className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ icon: Icon, label, type, placeholder, value, onChange, hint, required }: any) {
  return (
    <div>
      <label className="font-mono text-[10px] text-slate-600 uppercase tracking-widest font-semibold block mb-1.5">
        {label} {required && <span className="text-brand-orange">*</span>}
      </label>
      <div className={`relative flex items-center border border-slate-200 bg-white focus-within:border-brand-blue`}>
        {Icon && <Icon className="w-4 h-4 text-slate-400 ml-3" />}
        <input
          type={type || 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
        />
      </div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}
