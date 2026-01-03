// Image Effects Library
// Standalone file untuk effects agar kode tetap ringan

export interface Effect {
  id: string;
  name: string;
  icon: string;
  apply: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void;
}

export const imageEffects: Record<string, Effect> = {
  grayscale: {
    id: 'grayscale',
    name: 'Grayscale',
    icon: '⚪',
    apply: (canvas, ctx) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);
    },
  },
  sepia: {
    id: 'sepia',
    name: 'Sepia',
    icon: '🟫',
    apply: (canvas, ctx) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
      ctx.putImageData(imageData, 0, 0);
    },
  },
  invert: {
    id: 'invert',
    name: 'Invert',
    icon: '⚫',
    apply: (canvas, ctx) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      ctx.putImageData(imageData, 0, 0);
    },
  },
  brightness: {
    id: 'brightness',
    name: 'Bright',
    icon: '☀️',
    apply: (canvas, ctx) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const brightness = 50;
      for (let i = 0; i < data.length; i += 4) {
        data[i] += brightness;
        data[i + 1] += brightness;
        data[i + 2] += brightness;
      }
      ctx.putImageData(imageData, 0, 0);
    },
  },
  darkness: {
    id: 'darkness',
    name: 'Dark',
    icon: '🌙',
    apply: (canvas, ctx) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const darkness = 50;
      for (let i = 0; i < data.length; i += 4) {
        data[i] -= darkness;
        data[i + 1] -= darkness;
        data[i + 2] -= darkness;
      }
      ctx.putImageData(imageData, 0, 0);
    },
  },
  saturate: {
    id: 'saturate',
    name: 'Saturate',
    icon: '🎨',
    apply: (canvas, ctx) => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        let h, s;

        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          h = (max === r ? (g - b) / d + (g < b ? 6 : 0) :
               max === g ? (b - r) / d + 2 :
               (r - g) / d + 4) / 6;
        }

        s = Math.min(1, s * 1.5);
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;

        let nr, ng, nb;
        if (h < 1 / 6) [nr, ng, nb] = [c, x, 0];
        else if (h < 2 / 6) [nr, ng, nb] = [x, c, 0];
        else if (h < 3 / 6) [nr, ng, nb] = [0, c, x];
        else if (h < 4 / 6) [nr, ng, nb] = [0, x, c];
        else if (h < 5 / 6) [nr, ng, nb] = [x, 0, c];
        else [nr, ng, nb] = [c, 0, x];

        data[i] = Math.round((nr + m) * 255);
        data[i + 1] = Math.round((ng + m) * 255);
        data[i + 2] = Math.round((nb + m) * 255);
      }
      ctx.putImageData(imageData, 0, 0);
    },
  },
  blur: {
    id: 'blur',
    name: 'Blur',
    icon: '🌫️',
    apply: (canvas, ctx) => {
      ctx.filter = 'blur(5px)';
      ctx.drawImage(canvas, 0, 0);
    },
  },
};

export const getEffectsList = (): Array<{ id: string; name: string; icon: string }> => {
  return Object.values(imageEffects).map(({ id, name, icon }) => ({ id, name, icon }));
};

export const applyEffect = (effectId: string, canvas: HTMLCanvasElement) => {
  const effect = imageEffects[effectId];
  if (!effect) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  effect.apply(canvas, ctx);
};
