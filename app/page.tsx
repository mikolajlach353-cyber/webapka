
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type Participant = {
  id: number;
  name: string;
  score: number;
  user_id: string | null;
};

type RestCounts = {
  [participantId: number]: number;
};

type Activity = {
  id: number;
  participant_id: number;
  choice: string;
  choice_date: string;
  created_at: string;
};

const options = [
  {
    points: 1,
    title: "+1 punkt",
    description: "Zrobiłem dzisiaj krok do przodu",
    emoji: "🔥",
  },
  {
    points: -2,
    title: "-2 punkty",
    description: "Dzisiaj nie poszło zgodnie z planem",
    emoji: "📉",
  },
  {
    points: 0,
    title: "Rest day",
    description: "Dzisiaj odpoczywam",
    emoji: "😴",
  },
];

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

function getTodayDate() {
  return formatLocalDate(new Date());
}

function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    monday: formatLocalDate(monday),
    sunday: formatLocalDate(sunday),
  };
}

function getChoiceInfo(choice: string) {
  if (choice === "plus1") {
    return {
      emoji: "🔥",
      label: "+1 punkt",
    };
  }

  if (choice === "minus2") {
    return {
      emoji: "📉",
      label: "-2 punkty",
    };
  }

  if (choice === "rest") {
    return {
      emoji: "😴",
      label: "Rest day",
    };
  }

  return {
    emoji: "❓",
    label: choice,
  };
}

function formatActivityDate(dateString: string) {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function calculateStreaks(activities: Activity[]) {
  const uniqueDates = Array.from(
    new Set(activities.map((activity) => activity.choice_date))
  ).sort((a, b) => a.localeCompare(b));

  if (uniqueDates.length === 0) {
    return {
      current: 0,
      record: 0,
    };
  }

  let record = 1;
  let currentSequence = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const previous = new Date(`${uniqueDates[i - 1]}T12:00:00`);
    const current = new Date(`${uniqueDates[i]}T12:00:00`);

    const difference =
      (current.getTime() - previous.getTime()) /
      (1000 * 60 * 60 * 24);

    if (difference === 1) {
      currentSequence += 1;
      record = Math.max(record, currentSequence);
    } else {
      currentSequence = 1;
    }
  }

  const today = new Date(`${getTodayDate()}T12:00:00`);
  const lastDate = new Date(
    `${uniqueDates[uniqueDates.length - 1]}T12:00:00`
  );

  const daysSinceLastActivity = Math.round(
    (today.getTime() - lastDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastActivity > 1) {
    return {
      current: 0,
      record,
    };
  }

  let current = 1;

  for (let i = uniqueDates.length - 1; i > 0; i--) {
    const currentDate = new Date(
      `${uniqueDates[i]}T12:00:00`
    );

    const previousDate = new Date(
      `${uniqueDates[i - 1]}T12:00:00`
    );

    const difference =
      (currentDate.getTime() - previousDate.getTime()) /
      (1000 * 60 * 60 * 24);

    if (difference === 1) {
      current += 1;
    } else {
      break;
    }
  }

  return {
    current,
    record,
  };
}

async function hashLoginCode(code: string) {
  const data = new TextEncoder().encode(code);

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

function AnimatedFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`animated-border ${className}`}>
      <div className="animated-border-inner">
        {children}
      </div>
    </div>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const progress = Math.min(100, Math.max(0, score));

  const radius = 82;
  const circumference = 2 * Math.PI * radius;

  const offset =
    circumference - (progress / 100) * circumference;

  return (
    <div className="relative mx-auto h-56 w-56 sm:h-64 sm:w-64">
      <div className="absolute inset-6 rounded-full bg-blue-500/10 blur-3xl" />

      <svg
        className="relative h-full w-full -rotate-90"
        viewBox="0 0 200 200"
      >
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          className="text-zinc-800/80"
        />

        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter:
              "drop-shadow(0 0 8px rgba(59,130,246,0.45))",
          }}
        />

        <defs>
          <linearGradient
            id="scoreGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-7xl font-black tracking-[-0.06em] text-white sm:text-8xl">
          {score}
        </span>

        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          punktów
        </span>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-blue-400/80">
            {eyebrow}
          </p>
        )}

        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-sm text-zinc-500">
            {description}
          </p>
        )}
      </div>

      {right}
    </div>
  );
}

function StatItem({
  label,
  value,
  accent = false,
  icon,
}: {
  label: string;
  value: string;
  accent?: boolean;
  icon: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
          accent
            ? "bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.12)]"
            : "bg-white/[0.04]"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0 text-left">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">
          {label}
        </p>

        <p
          className={`mt-0.5 truncate text-sm font-bold ${
            accent ? "text-blue-300" : "text-zinc-200"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [participants, setParticipants] =
    useState<Participant[]>([]);

  const [currentParticipant, setCurrentParticipant] =
    useState<Participant | null>(null);

  const [restCounts, setRestCounts] =
    useState<RestCounts>({});

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [streakActivities, setStreakActivities] =
    useState<Activity[]>([]);

  const [selected, setSelected] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [activityLoading, setActivityLoading] =
    useState(true);

  const [joining, setJoining] =
    useState(false);

  const [name, setName] =
    useState("");

  const [loginCode, setLoginCode] =
    useState("");

  const [authMode, setAuthMode] =
    useState<"login" | "register">("login");

  const [error, setError] =
    useState<string | null>(null);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [profileName, setProfileName] =
    useState("");

  const [profileCode, setProfileCode] =
    useState("");

  const [showProfileCode, setShowProfileCode] =
    useState(false);

  const [profileSaving, setProfileSaving] =
    useState(false);

  const [profileMessage, setProfileMessage] =
    useState<string | null>(null);

  function getSavedParticipant(): Participant | null {
    if (typeof window === "undefined") {
      return null;
    }

    const saved = localStorage.getItem(
      "daily-challenge-user"
    );

    if (!saved) {
      return null;
    }

    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(
        "daily-challenge-user"
      );

      return null;
    }
  }

  function getSavedLoginCode() {
    if (typeof window === "undefined") {
      return "";
    }

    return (
      localStorage.getItem(
        "daily-challenge-login-code"
      ) ?? ""
    );
  }

  function saveParticipant(
    participant: Participant
  ) {
    localStorage.setItem(
      "daily-challenge-user",
      JSON.stringify(participant)
    );
  }

  function saveLoginCode(code: string) {
    localStorage.setItem(
      "daily-challenge-login-code",
      code
    );
  }

  function logoutParticipant() {
    localStorage.removeItem(
      "daily-challenge-user"
    );

    localStorage.removeItem(
      "daily-challenge-login-code"
    );

    window.location.reload();
  }

  async function loadData(
    participantOverride?: Participant
  ) {
    setLoading(true);
    setActivityLoading(true);
    setError(null);

    try {
      const current =
        participantOverride ??
        currentParticipant ??
        getSavedParticipant();

      if (!current) {
        setParticipants([]);
        setRestCounts({});
        setActivities([]);
        setStreakActivities([]);
        setSelected(null);
        return;
      }

      setCurrentParticipant(current);

      const {
        data: freshParticipant,
        error: freshParticipantError,
      } = await supabase
        .from("participants")
        .select("*")
        .eq("id", current.id)
        .maybeSingle();

      if (freshParticipantError) {
        console.error(
          "Błąd pobierania użytkownika:",
          freshParticipantError
        );
      }

      const activeParticipant =
        freshParticipant ?? current;

      setCurrentParticipant(activeParticipant);
      saveParticipant(activeParticipant);

      const {
        data: participantsData,
        error: participantsError,
      } = await supabase
        .from("participants")
        .select("*")
        .order("score", {
          ascending: false,
        });

      if (participantsError) {
        throw participantsError;
      }

      const loadedParticipants =
        participantsData ?? [];

      setParticipants(loadedParticipants);

      const { monday, sunday } =
        getWeekDates();

      const {
        data: restData,
        error: restError,
      } = await supabase
        .from("daily_choices")
        .select(
          "participant_id, choice_date"
        )
        .eq("choice", "rest")
        .gte("choice_date", monday)
        .lte("choice_date", sunday);

      if (restError) {
        console.error(
          "Błąd pobierania Rest day:",
          restError
        );
      }

      const counts: RestCounts = {};

      loadedParticipants.forEach(
        (participant) => {
          counts[participant.id] = 0;
        }
      );

      (restData ?? []).forEach(
        (rest) => {
          if (
            counts[rest.participant_id] !==
            undefined
          ) {
            counts[rest.participant_id] += 1;
          }
        }
      );

      setRestCounts(counts);

      const {
        data: activitiesData,
        error: activitiesError,
      } = await supabase
        .from("daily_choices")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(10);

      if (activitiesError) {
        console.error(
          "Błąd historii:",
          activitiesError
        );

        setActivities([]);
      } else {
        setActivities(
          activitiesData ?? []
        );
      }

      const {
        data: currentActivitiesData,
        error: currentActivitiesError,
      } = await supabase
        .from("daily_choices")
        .select("*")
        .eq(
          "participant_id",
          activeParticipant.id
        )
        .order("created_at", {
          ascending: false,
        });

      if (currentActivitiesError) {
        console.error(
          "Błąd streaku:",
          currentActivitiesError
        );

        setStreakActivities([]);
      } else {
        const currentActivities =
          currentActivitiesData ?? [];

        setStreakActivities(
          currentActivities
        );

        const today =
          getTodayDate();

        const todayActivity =
          currentActivities.find(
            (activity) =>
              activity.choice_date ===
              today
          );

        if (todayActivity) {
          if (
            todayActivity.choice ===
            "plus1"
          ) {
            setSelected(1);
          } else if (
            todayActivity.choice ===
            "minus2"
          ) {
            setSelected(-2);
          } else if (
            todayActivity.choice ===
            "rest"
          ) {
            setSelected(0);
          }
        } else {
          setSelected(null);
        }
      }
    } catch (err) {
      console.error(
        "Błąd ładowania aplikacji:",
        err
      );

      setError(
        "Nie udało się połączyć z aplikacją."
      );
    } finally {
      setLoading(false);
      setActivityLoading(false);
    }
  }

  useEffect(() => {
    const savedParticipant =
      getSavedParticipant();

    if (savedParticipant) {
      setCurrentParticipant(
        savedParticipant
      );

      setProfileName(
        savedParticipant.name
      );

      setProfileCode(
        getSavedLoginCode()
      );

      loadData(savedParticipant);
    } else {
      setLoading(false);
      setActivityLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loginOrRegister(
    mode: "login" | "register"
  ) {
    const trimmedName =
      name.trim();

    if (!trimmedName) {
      setError("Wpisz swój nick.");
      return;
    }

    if (
      trimmedName.length < 2 ||
      trimmedName.length > 30
    ) {
      setError(
        "Nick musi mieć od 2 do 30 znaków."
      );
      return;
    }

    if (!/^\d{4}$/.test(loginCode)) {
      setError(
        "Kod musi składać się z dokładnie 4 cyfr."
      );
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const codeHash =
        await hashLoginCode(loginCode);

      if (mode === "register") {
        const {
          data: existingUser,
          error: existingUserError,
        } = await supabase
          .from("participants")
          .select("id")
          .eq("name", trimmedName)
          .maybeSingle();

        if (existingUserError) {
          setError(
            existingUserError.message ||
              "Nie udało się sprawdzić nicku."
          );

          return;
        }

        if (existingUser) {
          setError(
            "Taki nick już istnieje. Wybierz inny."
          );

          return;
        }

        const {
          data: newParticipant,
          error: registerError,
        } = await supabase
          .from("participants")
          .insert({
            name: trimmedName,
            score: 0,
            login_code_hash: codeHash,
          })
          .select(
            "id, name, score, user_id"
          )
          .single();

        if (registerError) {
          setError(
            registerError.message ||
              "Nie udało się utworzyć konta."
          );

          return;
        }

        if (!newParticipant) {
          setError(
            "Konto zostało utworzone, ale nie otrzymano danych użytkownika."
          );

          return;
        }

        const participant =
          newParticipant as Participant;

        saveParticipant(participant);
        saveLoginCode(loginCode);

        setCurrentParticipant(
          participant
        );

        setName("");
        setLoginCode("");

        await loadData(participant);

        return;
      }

      const {
        data: participant,
        error: loginError,
      } = await supabase
        .from("participants")
        .select(
          "id, name, score, user_id"
        )
        .eq("name", trimmedName)
        .eq(
          "login_code_hash",
          codeHash
        )
        .maybeSingle();

      if (loginError) {
        setError(
          loginError.message ||
            "Nie udało się zalogować."
        );

        return;
      }

      if (!participant) {
        setError(
          "Nieprawidłowy nick lub kod."
        );

        return;
      }

      const loggedParticipant =
        participant as Participant;

      saveParticipant(
        loggedParticipant
      );

      saveLoginCode(loginCode);

      setCurrentParticipant(
        loggedParticipant
      );

      setName("");
      setLoginCode("");

      await loadData(
        loggedParticipant
      );
    } catch (err) {
      console.error(
        "Błąd logowania/rejestracji:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Nie udało się połączyć z aplikacją."
      );
    } finally {
      setJoining(false);
    }
  }

  async function saveProfile() {
    if (!currentParticipant) {
      return;
    }

    const newName =
      profileName.trim();

    if (
      newName.length < 2 ||
      newName.length > 30
    ) {
      setProfileMessage(
        "Nick musi mieć od 2 do 30 znaków."
      );

      return;
    }

    if (!/^\d{4}$/.test(profileCode)) {
      setProfileMessage(
        "Kod musi składać się z dokładnie 4 cyfr."
      );

      return;
    }

    setProfileSaving(true);
    setProfileMessage(null);

    try {
      if (
        newName !== currentParticipant.name
      ) {
        const {
          data: existingUser,
          error: existingError,
        } = await supabase
          .from("participants")
          .select("id")
          .eq("name", newName)
          .neq(
            "id",
            currentParticipant.id
          )
          .maybeSingle();

        if (existingError) {
          setProfileMessage(
            existingError.message
          );

          return;
        }

        if (existingUser) {
          setProfileMessage(
            "Taki nick już istnieje."
          );

          return;
        }
      }

      const codeHash =
        await hashLoginCode(profileCode);

      const {
        data: updatedParticipant,
        error: updateError,
      } = await supabase
        .from("participants")
        .update({
          name: newName,
          login_code_hash: codeHash,
        })
        .eq(
          "id",
          currentParticipant.id
        )
        .select(
          "id, name, score, user_id"
        )
        .single();

      if (updateError) {
        setProfileMessage(
          updateError.message ||
            "Nie udało się zapisać zmian."
        );

        return;
      }

      const updated =
        updatedParticipant as Participant;

      setCurrentParticipant(updated);
      saveParticipant(updated);
      saveLoginCode(profileCode);

      setProfileName(updated.name);
      setProfileCode(profileCode);

      setProfileMessage(
        "Profil został zaktualizowany."
      );

      await loadData(updated);
    } catch (err) {
      console.error(
        "Błąd profilu:",
        err
      );

      setProfileMessage(
        err instanceof Error
          ? err.message
          : "Nie udało się zapisać profilu."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function chooseOption(
    points: number
  ) {
    if (!currentParticipant) {
      return;
    }

    if (selected !== null) {
      alert(
        "Masz już dzisiejszy wybór. Najpierw go cofnij."
      );

      return;
    }

    const participant =
      currentParticipant;

    const today =
      getTodayDate();

    const {
      data: existingChoice,
      error: checkError,
    } = await supabase
      .from("daily_choices")
      .select("id, choice")
      .eq(
        "participant_id",
        participant.id
      )
      .eq(
        "choice_date",
        today
      )
      .maybeSingle();

    if (checkError) {
      alert(
        "Nie udało się sprawdzić dzisiejszego wyboru."
      );

      return;
    }

    if (existingChoice) {
      await loadData(
        participant
      );

      alert(
        "Dzisiejszy wybór został już wykonany."
      );

      return;
    }

    if (points === 0) {
      const currentRestCount =
        restCounts[
          participant.id
        ] ?? 0;

      if (currentRestCount >= 2) {
        alert(
          "W tym tygodniu wykorzystałeś już 2 Rest day."
        );

        return;
      }

      const {
        error: insertError,
      } = await supabase
        .from("daily_choices")
        .insert({
          participant_id:
            participant.id,
          choice: "rest",
          choice_date: today,
        });

      if (insertError) {
        alert(
          "Nie udało się zapisać wyboru."
        );

        return;
      }

      await loadData(
        participant
      );

      return;
    }

    const newScore =
      participant.score +
      points;

    const {
      error: updateError,
    } = await supabase
      .from("participants")
      .update({
        score: newScore,
      })
      .eq(
        "id",
        participant.id
      );

    if (updateError) {
      alert(
        `Nie udało się zmienić punktów: ${updateError.message}`
      );

      return;
    }

    const choice =
      points === 1
        ? "plus1"
        : "minus2";

    const {
      error: insertActivityError,
    } = await supabase
      .from("daily_choices")
      .insert({
        participant_id:
          participant.id,
        choice,
        choice_date: today,
      });

    if (insertActivityError) {
      await supabase
        .from("participants")
        .update({
          score:
            participant.score,
        })
        .eq(
          "id",
          participant.id
        );

      alert(
        "Nie udało się zapisać wyboru."
      );

      return;
    }

    await loadData(
      participant
    );
  }

  async function undoTodayChoice() {
    if (!currentParticipant) {
      return;
    }

    const today =
      getTodayDate();

    const {
      data: todayChoice,
      error: findError,
    } = await supabase
      .from("daily_choices")
      .select("*")
      .eq(
        "participant_id",
        currentParticipant.id
      )
      .eq(
        "choice_date",
        today
      )
      .maybeSingle();

    if (findError) {
      alert(
        "Nie udało się znaleźć dzisiejszego wyboru."
      );

      return;
    }

    if (!todayChoice) {
      await loadData(
        currentParticipant
      );

      return;
    }

    const oldScore =
      currentParticipant.score;

    let newScore =
      oldScore;

    if (
      todayChoice.choice ===
      "plus1"
    ) {
      newScore =
        oldScore - 1;
    }

    if (
      todayChoice.choice ===
      "minus2"
    ) {
      newScore =
        oldScore + 2;
    }

    if (
      todayChoice.choice ===
        "plus1" ||
      todayChoice.choice ===
        "minus2"
    ) {
      const {
        error: scoreError,
      } = await supabase
        .from("participants")
        .update({
          score: newScore,
        })
        .eq(
          "id",
          currentParticipant.id
        );

      if (scoreError) {
        alert(
          "Nie udało się cofnąć punktów."
        );

        return;
      }
    }

    const {
      error: deleteError,
    } = await supabase
      .from("daily_choices")
      .delete()
      .eq(
        "id",
        todayChoice.id
      );

    if (deleteError) {
      if (
        todayChoice.choice ===
          "plus1" ||
        todayChoice.choice ===
          "minus2"
      ) {
        await supabase
          .from("participants")
          .update({
            score: oldScore,
          })
          .eq(
            "id",
            currentParticipant.id
          );
      }

      alert(
        "Nie udało się cofnąć wyboru."
      );

      return;
    }

    await loadData(
      currentParticipant
    );
  }

  if (
    loading &&
    !currentParticipant
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07090d] px-4 text-white">
        <div className="text-center">
          <div className="animate-pulse text-5xl">
            🔥
          </div>

          <p className="mt-5 text-sm text-zinc-500">
            Przygotowywanie Tytan Challenge...
          </p>
        </div>
      </main>
    );
  }

  if (!currentParticipant) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07090d] px-4 py-8 text-white">
        <div className="titan-lines pointer-events-none" />

        <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />

        <div className="relative w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-[0_0_40px_rgba(59,130,246,0.15)]">
              🔥
            </div>

            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.3em] text-blue-400">
              Tytan Challenge
            </p>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              {authMode === "login"
                ? "Witaj ponownie"
                : "Nowe konto"}
            </h1>

            <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-zinc-500">
              {authMode === "login"
                ? "Zaloguj się swoim nickiem i 4-cyfrowym kodem."
                : "Utwórz konto do Tytan Challenge."}
            </p>
          </div>

          <AnimatedFrame>
            <div className="rounded-[26px] bg-zinc-900/80 p-6">
              <label
                htmlFor="participant-name"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
              >
                Twój nick
              </label>

              <input
                id="participant-name"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="np. Kuba"
                maxLength={30}
                disabled={joining}
                className="w-full rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-4 text-white outline-none transition placeholder:text-zinc-700 focus:border-blue-500/60 focus:bg-blue-500/[0.03] disabled:opacity-50"
                autoFocus
              />

              <label
                htmlFor="participant-code"
                className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
              >
                4-cyfrowy kod
              </label>

              <input
                id="participant-code"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={loginCode}
                onChange={(event) =>
                  setLoginCode(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 4)
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    loginOrRegister(
                      authMode
                    );
                  }
                }}
                placeholder="••••"
                disabled={joining}
                className="w-full rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-4 text-center text-xl font-bold tracking-[0.5em] text-white outline-none transition placeholder:text-zinc-700 focus:border-blue-500/60 focus:bg-blue-500/[0.03] disabled:opacity-50"
              />

              {error && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  loginOrRegister(
                    authMode
                  )
                }
                disabled={
                  joining ||
                  !name.trim() ||
                  loginCode.length !== 4
                }
                className="mt-4 w-full rounded-2xl bg-white px-4 py-4 font-bold text-zinc-950 transition-all duration-300 hover:bg-blue-50 hover:shadow-[0_0_30px_rgba(59,130,246,0.18)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {joining
                  ? "Chwileczkę..."
                  : authMode === "login"
                  ? "Zaloguj się"
                  : "Utwórz konto"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode(
                    authMode === "login"
                      ? "register"
                      : "login"
                  );

                  setError(null);
                }}
                className="mt-4 w-full text-sm text-zinc-500 transition hover:text-zinc-300"
              >
                {authMode === "login"
                  ? "Nie masz konta? Utwórz je"
                  : "Masz już konto? Zaloguj się"}
              </button>
            </div>
          </AnimatedFrame>
        </div>
      </main>
    );
  }

  const myScore =
    currentParticipant.score;

  const myRestCount =
    restCounts[
      currentParticipant.id
    ] ?? 0;

  const myRankingPosition =
    participants.findIndex(
      (participant) =>
        participant.id ===
        currentParticipant.id
    ) + 1;

  const {
    current: currentStreak,
    record: recordStreak,
  } = calculateStreaks(
    streakActivities
  );

  const todayChoiceLabel =
    selected === null
      ? "Brak wyboru"
      : selected === 1
      ? "+1 punkt"
      : selected === -2
      ? "-2 punkty"
      : "Rest day";

  const todayChoiceEmoji =
    selected === null
      ? "—"
      : selected === 1
      ? "🔥"
      : selected === -2
      ? "📉"
      : "😴";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07090d] px-4 py-8 text-white sm:py-12">
      <style jsx global>{`
        @keyframes borderFlow {
          0% {
            background-position: 0% 50%;
          }

          50% {
            background-position: 100% 50%;
          }

          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes titanLineMove {
          0% {
            transform: translate3d(-8%, 0, 0);
            opacity: 0;
          }

          12% {
            opacity: 0.18;
          }

          50% {
            opacity: 0.1;
          }

          88% {
            opacity: 0.18;
          }

          100% {
            transform: translate3d(8%, 0, 0);
            opacity: 0;
          }
        }

        @keyframes titanLineMoveReverse {
          0% {
            transform: translate3d(8%, 0, 0);
            opacity: 0;
          }

          12% {
            opacity: 0.13;
          }

          50% {
            opacity: 0.07;
          }

          88% {
            opacity: 0.13;
          }

          100% {
            transform: translate3d(-8%, 0, 0);
            opacity: 0;
          }
        }

        .titan-lines {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          contain: strict;
        }

        .titan-lines::before,
        .titan-lines::after {
          content: "";
          position: absolute;
          inset: -20%;
          background-image:
            linear-gradient(
              115deg,
              transparent 0%,
              transparent 47%,
              rgba(255, 255, 255, 0.055) 48%,
              rgba(255, 255, 255, 0.055) 48.15%,
              transparent 49%,
              transparent 100%
            );
          background-size: 310px 310px;
          animation: titanLineMove 32s linear infinite;
          will-change: transform;
        }

        .titan-lines::after {
          background-size: 420px 420px;
          animation:
            titanLineMoveReverse 43s linear infinite;
          opacity: 0.55;
        }

        .animated-border {
          position: relative;
          padding: 1px;
          border-radius: 31px;
          background: linear-gradient(
            120deg,
            rgba(59, 130, 246, 0.18),
            rgba(96, 165, 250, 0.55),
            rgba(139, 92, 246, 0.28),
            rgba(34, 211, 238, 0.38),
            rgba(59, 130, 246, 0.18)
          );
          background-size: 300% 300%;
          animation: borderFlow 8s ease infinite;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.015),
            0 0 35px rgba(59, 130, 246, 0.035);
          transition:
            box-shadow 300ms ease,
            filter 300ms ease;
        }

        .animated-border:hover {
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.025),
            0 0 42px rgba(59, 130, 246, 0.07);
        }

        .animated-border-inner {
          height: 100%;
          border-radius: 30px;
          background: rgba(10, 12, 17, 0.94);
        }

        .animated-choice {
          position: relative;
          padding: 1px;
          border-radius: 31px;
          background: linear-gradient(
            120deg,
            rgba(59, 130, 246, 0.12),
            rgba(96, 165, 250, 0.45),
            rgba(139, 92, 246, 0.2),
            rgba(34, 211, 238, 0.3),
            rgba(59, 130, 246, 0.12)
          );
          background-size: 300% 300%;
          animation: borderFlow 9s ease infinite;
          transition:
            transform 300ms ease,
            box-shadow 300ms ease,
            filter 300ms ease;
        }

        .animated-choice:hover {
          transform: translateY(-4px);
          box-shadow:
            0 15px 50px rgba(0, 0, 0, 0.28),
            0 0 35px rgba(59, 130, 246, 0.09);
          filter: brightness(1.06);
        }

        .animated-choice > button {
          width: 100%;
          height: 100%;
          border-radius: 30px;
        }

        .titan-interactive {
          transition:
            background-color 220ms ease,
            border-color 220ms ease,
            color 220ms ease,
            box-shadow 220ms ease,
            transform 220ms ease;
        }

        .titan-interactive:hover {
          border-color: rgba(255, 255, 255, 0.12);
          background-color: rgba(255, 255, 255, 0.045);
          box-shadow:
            0 8px 30px rgba(0, 0, 0, 0.16),
            0 0 20px rgba(255, 255, 255, 0.025);
        }

        .ranking-row {
          transition:
            background-color 220ms ease,
            box-shadow 220ms ease,
            transform 220ms ease;
        }

        .ranking-row:hover {
          background-color: rgba(255, 255, 255, 0.035);
          box-shadow:
            inset 3px 0 0 rgba(96, 165, 250, 0.3);
        }

        @media (prefers-reduced-motion: reduce) {
          .titan-lines::before,
          .titan-lines::after,
          .animated-border,
          .animated-choice {
            animation: none !important;
          }

          .animated-choice,
          .animated-border,
          .titan-interactive,
          .ranking-row {
            transition: none !important;
          }
        }
      `}</style>

      <div className="titan-lines" />

      <div className="pointer-events-none absolute left-1/2 top-0 z-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/[0.035] blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-10 sm:mb-14">
          <div className="mb-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setProfileName(
                  currentParticipant.name
                );

                setProfileCode(
                  getSavedLoginCode()
                );

                setProfileMessage(null);
                setShowProfileCode(false);
                setProfileOpen(true);
              }}
              className="titan-interactive rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              👤 Profil
            </button>

            <button
              type="button"
              onClick={
                logoutParticipant
              }
              className="titan-interactive rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-200"
            >
              Wyloguj
            </button>
          </div>

          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />

              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-blue-400/80">
                Tytan Challenge
              </p>

              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
            </div>

            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-6xl">
              Witam Cię,
              <br />
              <span className="bg-gradient-to-r from-white via-blue-100 to-blue-500 bg-clip-text text-transparent">
                Tytanie
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-zinc-500 sm:text-base">
              Każdy dzień to kolejny krok.
              <br />
              <span className="font-semibold text-zinc-200">
                {currentParticipant.name}
              </span>
            </p>
          </div>
        </header>

        <section className="mb-14">
          <AnimatedFrame>
            <div className="relative overflow-hidden rounded-[30px] px-5 py-8 sm:px-10 sm:py-10">
              <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/[0.07] blur-[100px]" />

              <div className="relative text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-blue-500/50" />

                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                    Obecna ilość punktów
                  </p>

                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-blue-500/50" />
                </div>

                <div className="mt-4">
                  <ScoreCircle
                    score={myScore}
                  />
                </div>
              </div>
            </div>
          </AnimatedFrame>
        </section>

        <section className="mb-14">
          <SectionHeader
            eyebrow="Dzisiaj"
            title="Co wybierasz?"
            description="Twój dzisiejszy wybór ma wpływ na wynik."
          />

          {selected !== null && (
            <div className="mb-5 flex flex-col items-center justify-between gap-4 rounded-2xl border border-blue-500/10 bg-blue-500/[0.04] p-4 sm:flex-row">
              <div>
                <p className="text-sm font-semibold text-zinc-200">
                  Dzisiejszy wybór:{" "}
                  <span className="text-blue-300">
                    {todayChoiceEmoji}{" "}
                    {todayChoiceLabel}
                  </span>
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Możesz go cofnąć i wybrać inną opcję.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  undoTodayChoice
                }
                className="titan-interactive w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-bold text-zinc-200 hover:text-white sm:w-auto"
              >
                ↩ Cofnij wybór
              </button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {options.map((option) => {
              const isSelected =
                selected ===
                option.points;

              const restLimitReached =
                option.points === 0 &&
                myRestCount >= 2;

              const choiceAlreadyMade =
                selected !== null;

              return (
                <div
                  key={option.title}
                  className={`animated-choice ${
                    restLimitReached ||
                    choiceAlreadyMade
                      ? "opacity-50"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      chooseOption(
                        option.points
                      )
                    }
                    disabled={
                      restLimitReached ||
                      choiceAlreadyMade
                    }
                    className={`group relative min-h-[250px] overflow-hidden p-7 text-left transition-all duration-300 ${
                      isSelected
                        ? "bg-blue-500/[0.09] shadow-[inset_0_0_35px_rgba(59,130,246,0.04)]"
                        : "bg-[#0b0e14] hover:bg-[#0f131b]"
                    } ${
                      restLimitReached ||
                      choiceAlreadyMade
                        ? "cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/10 blur-[70px]" />
                    )}

                    <div className="relative flex h-full flex-col">
                      <div className="mb-auto">
                        <div
                          className={`mb-8 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl transition-transform duration-300 ${
                            isSelected
                              ? "scale-110 bg-blue-500/15"
                              : "bg-white/[0.04] group-hover:scale-105"
                          }`}
                        >
                          {option.emoji}
                        </div>

                        <h3 className="text-2xl font-bold tracking-tight">
                          {option.title}
                        </h3>

                        <p className="mt-3 max-w-[230px] text-sm leading-6 text-zinc-500">
                          {restLimitReached
                            ? "Limit 2 Rest dayów wykorzystany"
                            : choiceAlreadyMade &&
                              !isSelected
                            ? "Najpierw cofnij dzisiejszy wybór"
                            : option.description}
                        </p>
                      </div>

                      <div className="mt-8 flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold uppercase tracking-wider ${
                            isSelected
                              ? "text-blue-300"
                              : "text-zinc-700 group-hover:text-zinc-400"
                          }`}
                        >
                          {isSelected
                            ? "Wybrano"
                            : "Wybierz"}
                        </span>

                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                            isSelected
                              ? "bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.35)]"
                              : "bg-white/[0.04] text-zinc-600 group-hover:bg-blue-500/10 group-hover:text-blue-400"
                          }`}
                        >
                          →
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-3">
          <section>
            <SectionHeader
              eyebrow="Twój profil"
              title="Statystyki"
              description="Twój aktualny status."
            />

            <AnimatedFrame className="h-full">
              <div className="h-full p-6 sm:p-7">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/70">
                      Twoje statystyki
                    </p>

                    <p className="mt-1 text-sm font-semibold text-zinc-300">
                      Aktualny status
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-sm shadow-[0_0_25px_rgba(59,130,246,0.08)]">
                    ✦
                  </div>
                </div>

                <div className="grid gap-5">
                  <StatItem
                    label="Miejsce w tabeli"
                    value={
                      myRankingPosition > 0
                        ? `#${myRankingPosition}`
                        : "—"
                    }
                    icon="🏆"
                    accent
                  />

                  <StatItem
                    label="Obecny streak"
                    value={`${currentStreak} dni`}
                    icon="🔥"
                    accent
                  />

                  <StatItem
                    label="Rekordowy streak"
                    value={`${recordStreak} dni`}
                    icon="⚡"
                  />

                  <StatItem
                    label="Dzisiejszy wybór"
                    value={`${todayChoiceEmoji} ${todayChoiceLabel}`}
                    icon="🎯"
                  />
                </div>

                <div className="mt-7 flex items-center justify-between border-t border-white/[0.05] pt-5">
                  <span className="text-xs text-zinc-600">
                    Rest day w tym tygodniu
                  </span>

                  <span className="rounded-full bg-white/[0.04] px-3 py-1 text-xs font-bold text-zinc-300">
                    {myRestCount}/2
                  </span>
                </div>
              </div>
            </AnimatedFrame>
          </section>

          <section>
            <SectionHeader
              eyebrow="Rywalizacja"
              title="Ranking"
              description="Wyniki uczestników."
              right={
                <div className="hidden rounded-full bg-white/[0.02] px-3 py-2 text-xs text-zinc-600 sm:block">
                  {participants.length}
                </div>
              }
            />

            <AnimatedFrame>
              <div className="overflow-hidden">
                <div className="grid grid-cols-[40px_1fr_75px_50px] border-b border-white/[0.05] px-4 py-4 text-[9px] font-bold uppercase tracking-wider text-zinc-600 sm:grid-cols-[45px_1fr_85px_55px] sm:px-5">
                  <span>#</span>
                  <span>Uczestnik</span>
                  <span className="text-right">
                    Punkty
                  </span>
                  <span className="text-right">
                    Rest
                  </span>
                </div>

                <div className="max-h-[470px] overflow-y-auto">
                  {loading && (
                    <div className="px-5 py-10 text-center text-sm text-zinc-500">
                      Ładowanie rankingu...
                    </div>
                  )}

                  {!loading &&
                    participants.length === 0 && (
                      <div className="px-5 py-10 text-center text-sm text-zinc-500">
                        Brak uczestników.
                      </div>
                    )}

                  {!loading &&
                    participants.map(
                      (
                        participant,
                        index
                      ) => {
                        const participantRestCount =
                          restCounts[
                            participant.id
                          ] ?? 0;

                        const isMe =
                          participant.id ===
                          currentParticipant.id;

                        return (
                          <div
                            key={
                              participant.id
                            }
                            className={`ranking-row grid grid-cols-[40px_1fr_75px_50px] items-center px-4 py-4 sm:grid-cols-[45px_1fr_85px_55px] sm:px-5 ${
                              index !==
                              participants.length -
                                1
                                ? "border-b border-white/[0.04]"
                                : ""
                            } ${
                              isMe
                                ? "bg-blue-500/[0.06]"
                                : ""
                            }`}
                          >
                            <div>
                              {index < 3 ? (
                                <span className="text-lg">
                                  {index ===
                                  0
                                    ? "🥇"
                                    : index ===
                                      1
                                    ? "🥈"
                                    : "🥉"}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-zinc-600">
                                  {index +
                                    1}
                                </span>
                              )}
                            </div>

                            <div className="flex min-w-0 items-center gap-2">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ${
                                  isMe
                                    ? "bg-blue-500/15 text-blue-300"
                                    : "bg-white/[0.04] text-zinc-500"
                                }`}
                              >
                                {participant.name
                                  .slice(
                                    0,
                                    1
                                  )
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-zinc-200">
                                  {
                                    participant.name
                                  }

                                  {isMe && (
                                    <span className="ml-1 text-[8px] font-bold uppercase tracking-wider text-blue-400">
                                      Ty
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span
                                className={`text-sm font-bold ${
                                  isMe
                                    ? "text-blue-300"
                                    : "text-zinc-300"
                                }`}
                              >
                                {
                                  participant.score
                                }
                              </span>
                            </div>

                            <div className="text-right text-[10px] font-semibold text-zinc-500">
                              {
                                participantRestCount
                              }
                              /2
                            </div>
                          </div>
                        );
                      }
                    )}
                </div>
              </div>
            </AnimatedFrame>
          </section>

          <section>
            <SectionHeader
              eyebrow="Historia"
              title="Akcje"
              description="Najnowsze działania."
              right={
                <span className="rounded-full bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-600">
                  10
                </span>
              }
            />

            <AnimatedFrame>
              <div className="relative overflow-hidden p-4 sm:p-5">
                <div className="absolute bottom-5 left-[29px] top-5 w-px bg-gradient-to-b from-blue-500/30 via-white/[0.05] to-transparent" />

                <div className="space-y-1">
                  {activityLoading && (
                    <div className="px-3 py-10 text-center text-sm text-zinc-500">
                      Ładowanie historii...
                    </div>
                  )}

                  {!activityLoading &&
                    activities.length === 0 && (
                      <div className="px-3 py-10 text-center text-sm text-zinc-500">
                        Brak aktywności.
                      </div>
                    )}

                  {!activityLoading &&
                    activities.map(
                      (activity) => {
                        const participant =
                          participants.find(
                            (item) =>
                              item.id ===
                              activity.participant_id
                          );

                        const choiceInfo =
                          getChoiceInfo(
                            activity.choice
                          );

                        const isMe =
                          activity.participant_id ===
                          currentParticipant.id;

                        return (
                          <div
                            key={activity.id}
                            className="group relative flex items-center gap-3 rounded-2xl px-1 py-3 transition-all hover:bg-white/[0.035]"
                          >
                            <div
                              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-lg transition-all duration-300 group-hover:scale-105 ${
                                isMe
                                  ? "border-blue-500/20 bg-blue-500/10"
                                  : "border-white/[0.06] bg-zinc-900"
                              }`}
                            >
                              {
                                choiceInfo.emoji
                              }
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                <span className="truncate text-sm font-semibold text-zinc-200">
                                  {participant?.name ??
                                    "Nieznany"}
                                </span>

                                {isMe && (
                                  <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-400">
                                    Ty
                                  </span>
                                )}
                              </div>

                              <p className="mt-0.5 text-xs text-zinc-500">
                                {
                                  choiceInfo.label
                                }
                              </p>
                            </div>

                            <div className="hidden shrink-0 text-right text-[10px] text-zinc-700 2xl:block">
                              {formatActivityDate(
                                activity.created_at
                              )}
                            </div>

                            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-800 transition-colors group-hover:bg-blue-500" />
                          </div>
                        );
                      }
                    )}
                </div>
              </div>
            </AnimatedFrame>
          </section>
        </div>

        <footer className="mt-16 pb-4 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-700">
            Tytan Challenge
          </p>
        </footer>
      </div>

      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setProfileOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md">
            <AnimatedFrame>
              <div className="rounded-[30px] bg-[#0b0e14] p-6 sm:p-7">
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-blue-400">
                      Tytan Challenge
                    </p>

                    <h2 className="text-2xl font-black text-white">
                      Twój profil
                    </h2>

                    <p className="mt-2 text-sm text-zinc-500">
                      Zarządzaj nickiem i kodem logowania.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setProfileOpen(false)
                    }
                    className="titan-interactive flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <label
                  htmlFor="profile-name"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                >
                  Twój nick
                </label>

                <input
                  id="profile-name"
                  type="text"
                  value={profileName}
                  onChange={(event) =>
                    setProfileName(
                      event.target.value
                    )
                  }
                  maxLength={30}
                  disabled={profileSaving}
                  className="w-full rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-4 text-white outline-none transition placeholder:text-zinc-700 focus:border-blue-500/60 focus:bg-blue-500/[0.03]"
                />

                <label
                  htmlFor="profile-code"
                  className="mb-2 mt-5 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                >
                  Kod logowania
                </label>

                <div className="relative">
                  <input
                    id="profile-code"
                    type={
                      showProfileCode
                        ? "text"
                        : "password"
                    }
                    inputMode="numeric"
                    maxLength={4}
                    value={profileCode}
                    onChange={(event) =>
                      setProfileCode(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 4)
                      )
                    }
                    disabled={profileSaving}
                    className="w-full rounded-2xl border border-white/[0.06] bg-black/30 px-4 py-4 pr-16 text-center text-xl font-bold tracking-[0.5em] text-white outline-none transition focus:border-blue-500/60 focus:bg-blue-500/[0.03]"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowProfileCode(
                        !showProfileCode
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
                  >
                    {showProfileCode
                      ? "Ukryj"
                      : "Pokaż"}
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-blue-500/10 bg-blue-500/[0.035] p-4">
                  <p className="text-xs leading-5 text-zinc-500">
                    🔐 Twój kod nie jest przechowywany
                    jako zwykły tekst w bazie danych.
                    Jest zapamiętywany lokalnie na tym
                    urządzeniu.
                  </p>
                </div>

                {profileMessage && (
                  <div
                    className={`mt-4 rounded-2xl border p-4 text-sm ${
                      profileMessage.includes(
                        "zaktualizowany"
                      )
                        ? "border-blue-500/20 bg-blue-500/5 text-blue-300"
                        : "border-red-500/20 bg-red-500/5 text-red-300"
                    }`}
                  >
                    {profileMessage}
                  </div>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setProfileOpen(false)
                    }
                    className="titan-interactive rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-4 text-sm font-bold text-zinc-400 hover:text-white"
                  >
                    Anuluj
                  </button>

                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={
                      profileSaving ||
                      profileName.trim().length <
                        2 ||
                      profileCode.length !== 4
                    }
                    className="rounded-2xl bg-white px-4 py-4 text-sm font-bold text-zinc-950 transition-all duration-300 hover:bg-blue-50 hover:shadow-[0_0_30px_rgba(59,130,246,0.18)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {profileSaving
                      ? "Zapisywanie..."
                      : "Zapisz zmiany"}
                  </button>
                </div>
              </div>
            </AnimatedFrame>
          </div>
        </div>
      )}
    </main>
  );
}

