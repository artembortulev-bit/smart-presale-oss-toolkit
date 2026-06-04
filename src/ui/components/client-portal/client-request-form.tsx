"use client";
/* eslint-disable @next/next/no-img-element */

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clientObjectTypeLabels,
  clientObjectTypes,
  clientSegmentLabels,
  clientSegments,
} from "@/application/client-intake/types";

type PreviewPhoto = {
  url: string;
  name: string;
};

export function ClientRequestForm() {
  const router = useRouter();
  const [previews, setPreviews] = useState<PreviewPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewCountLabel = useMemo(() => {
    if (previews.length === 0) {
      return "Загрузите 1-8 фото";
    }

    return `${previews.length} фото в заявке`;
  }, [previews.length]);

  function handlePhotosChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setPreviews((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return files.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
      }));
    });
  }

  function resetPreviews() {
    setPreviews((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    setSubmitting(true);

    startTransition(async () => {
      try {
        const response = await fetch("/api/client-requests", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as {
          id?: string;
          error?: string;
        };

        if (!response.ok || !payload.id) {
          throw new Error(payload.error ?? "Не удалось создать заявку.");
        }

        formElement.reset();
        resetPreviews();
        router.push(`/client/${payload.id}`);
        router.refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Не удалось отправить заявку.",
        );
      } finally {
        setSubmitting(false);
      }
    });
  }

  const fieldClassName =
    "h-12 w-full rounded-[18px] border border-[rgba(255,255,255,0.55)] bg-[rgba(255,255,255,0.62)] px-4 text-[var(--foreground)] backdrop-blur-xl";

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel space-y-5 rounded-[32px] p-6 shadow-[var(--shadow-card)]"
    >
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--foreground-muted)]">
          Клиентский кабинет
        </p>
        <h2 className="mt-3 text-[2rem] font-semibold leading-[0.98] text-[var(--foreground)]">
          Загрузка фото и запуск коммерческого контура
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--foreground-muted)]">
          Клиент загружает фотографии неизвестного оборудования, а система собирает черновую
          стоимость, бриф для 3D-модели и проект КП.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Контактное лицо
          </span>
          <input
            name="customerName"
            required
            className={fieldClassName}
            placeholder="Имя заказчика"
          />
        </label>

        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Компания
          </span>
          <input name="companyName" className={fieldClassName} placeholder="ООО Заказчик" />
        </label>

        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Email
          </span>
          <input
            name="email"
            type="email"
            className={fieldClassName}
            placeholder="mail@example.com"
          />
        </label>

        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Телефон
          </span>
          <input name="phone" className={fieldClassName} placeholder="+7 900 000-00-00" />
        </label>

        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Тип объекта
          </span>
          <select name="objectType" defaultValue="PLAYGROUND_COMPLEX" className={fieldClassName}>
            {clientObjectTypes.map((type) => (
              <option key={type} value={type}>
                {clientObjectTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Сегмент
          </span>
          <select name="segment" defaultValue="OPTIMUM" className={fieldClassName}>
            {clientSegments.map((segment) => (
              <option key={segment} value={segment}>
                {clientSegmentLabels[segment]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Длина, м
          </span>
          <input name="lengthM" type="number" step="0.1" min="0" className={fieldClassName} placeholder="4.5" />
        </label>

        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Ширина, м
          </span>
          <input name="widthM" type="number" step="0.1" min="0" className={fieldClassName} placeholder="3.2" />
        </label>

        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Высота, м
          </span>
          <input name="heightM" type="number" step="0.1" min="0" className={fieldClassName} placeholder="2.8" />
        </label>

        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Бюджет, ₽
          </span>
          <input name="targetBudgetRub" type="number" step="1000" min="0" className={fieldClassName} placeholder="900000" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Локация / адрес объекта
          </span>
          <input name="location" className={fieldClassName} placeholder="Москва, ЖК ..." />
        </label>

        <label className="space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
            Название проекта
          </span>
          <input name="projectName" className={fieldClassName} placeholder="Горка на склон" />
        </label>
      </div>

      <label className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
          Фотографии
        </span>
        <div className="rounded-[28px] border border-[rgba(255,255,255,0.52)] bg-[rgba(255,255,255,0.48)] p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--foreground)]">{previewCountLabel}</div>
              <div className="mt-1 text-sm text-[var(--foreground-muted)]">
                JPG, PNG или WEBP, до 12 МБ на файл.
              </div>
            </div>
            <input
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              required
              onChange={handlePhotosChange}
              className="max-w-full text-sm"
            />
          </div>

          {previews.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {previews.map((preview) => (
                <div
                  key={preview.url}
                  className="overflow-hidden rounded-[24px] border border-[rgba(255,255,255,0.55)] bg-[rgba(255,255,255,0.56)]"
                >
                  <div className="relative aspect-[4/3]">
                    <img src={preview.url} alt={preview.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="truncate px-4 py-3 text-sm text-[var(--foreground-muted)]">
                    {preview.name}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </label>

      <label className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
          Комментарий по объекту
        </span>
        <textarea
          name="notes"
          rows={5}
          className="w-full rounded-[24px] border border-[rgba(255,255,255,0.55)] bg-[rgba(255,255,255,0.58)] px-4 py-4 text-[var(--foreground)] backdrop-blur-xl"
          placeholder="Что именно нужно повторить, какие материалы важны, есть ли пожелания по цвету, высоте, канатам, навесам и т.д."
        />
      </label>

      <div className="flex flex-wrap gap-6">
        <label className="inline-flex items-center gap-3 text-sm text-[var(--foreground)]">
          <input type="checkbox" name="needsDelivery" className="h-4 w-4" />
          Нужна доставка
        </label>
        <label className="inline-flex items-center gap-3 text-sm text-[var(--foreground)]">
          <input type="checkbox" name="needsInstallation" className="h-4 w-4" />
          Нужен монтаж
        </label>
      </div>

      {error ? (
        <div className="rounded-[20px] border border-[rgba(200,70,40,0.16)] bg-[rgba(242,102,34,0.08)] px-4 py-3 text-sm text-[var(--foreground)]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent)_0%,#ff7a29_100%)] px-6 text-sm font-semibold text-white shadow-[0_18px_48px_rgba(239,100,29,0.26)] transition disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "Собираем заявку..." : "Создать фото-заявку"}
      </button>
    </form>
  );
}
