import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import "./App.css";

type Entry = {
  time: string;         
  label: string;      
  caffeineMg: number; 
};

type Point = { time: string; caffeine: number };

const HALF_LIFE_HOURS = 5;

const PRESET_DRINKS = [
  { label: "Espresso 80mg", mg: 80 },
  { label: "Coffee 95mg", mg: 95 },
  { label: "Energy Drink 160mg", mg: 160 },
  { label: "Cold Brew 200mg", mg: 200 },
];

function App() {
  const [time, setTime] = useState("");
  const [drinkLabel, setDrinkLabel] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [customMg, setCustomMg] = useState<string>("");

  const [entries, setEntries] = useState<Entry[]>([]);

  const timeOptions = useMemo(() => {
    const out: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 30, 45]) {
        out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    out.push("24:00");
    return out;
  }, []);

  const selectedPreset = PRESET_DRINKS.find(d => d.label === drinkLabel);
  const customMgNum = Number.isFinite(Number(customMg)) ? Number(customMg) : 0;
  const canUseCustom = useCustom && customMgNum > 0;

  const isAddDisabled =
    !time || (!canUseCustom && !selectedPreset) || (canUseCustom && customMgNum <= 0);

  const addCoffee = () => {
    if (isAddDisabled) return;

    const entry: Entry = canUseCustom
      ? {
          time,
          label: `Custom ${customMgNum}mg`,
          caffeineMg: customMgNum,
        }
      : {
          time,
          label: selectedPreset!.label,
          caffeineMg: selectedPreset!.mg,
        };

    setEntries(prev => [...prev, entry]);

    setTime("");
    if (useCustom) {
      setCustomMg("");
    } else {
      setDrinkLabel("");
    }
  };

  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const parseTimeToHours = (t: string) => {
    if (t === "24:00") return 24; // Sonderfall
    const [hh, mm] = t.split(":").map(Number);
    return hh + mm / 60;
  };

  const calculateCaffeineCurve = (): Point[] => {
    const hours = [...Array(24).keys()]; // 0..23
    const data: Point[] = [];

    for (const h of hours) {
      const xHour = h;
      let sum = 0;

      entries.forEach(e => {
        const tEntry = parseTimeToHours(e.time);
        const diff = xHour - tEntry;
        if (diff >= 0) {
          // C(t) = C0 * (1/2)^(t / HALF_LIFE_HOURS)
          sum += e.caffeineMg * Math.pow(0.5, diff / HALF_LIFE_HOURS);
        }
      });

      data.push({
        time: `${String(h).padStart(2, "0")}:00`,
        caffeine: Math.round(sum),
      });
    }

    return data;
  };

  const chartData = useMemo(calculateCaffeineCurve, [entries]);

  const totalMg = entries.reduce((acc, e) => acc + e.caffeineMg, 0);

  return (
    <div className="main-container">
      <div className="header">
        <h1>Caffeine Calculator</h1>
        <div className="header-meta">
          <span className="badge">{entries.length} entries</span>
          <span className="badge">{totalMg} mg total</span>
        </div>
      </div>

      <div className="body">
        <div className="left">
          <div className="add-coffee-container card">
            <h3>Add Drink</h3>

            <div className="input-row">
              <label className="label">Time</label>
              <select
                className="select"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                <option value="">Select time</option>
                {timeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="input-row">
              <label className="label">Mode</label>
              <div className="toggle-wrap">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={useCustom}
                    onChange={(e) => setUseCustom(e.target.checked)}
                  />
                  <span />
                </label>
                <span className="muted">
                  {useCustom ? "Custom amount (mg)" : "Preset drink"}
                </span>
              </div>
            </div>

            {!useCustom ? (
              <div className="input-row">
                <label className="label">Drink</label>
                <select
                  className="select"
                  value={drinkLabel}
                  onChange={(e) => setDrinkLabel(e.target.value)}
                >
                  <option value="">Select drink</option>
                  {PRESET_DRINKS.map(d => (
                    <option key={d.label} value={d.label}>{d.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="input-row">
                <label className="label">Amount</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 120"
                  min={1}
                  max={1000}
                  step={5}
                  value={customMg}
                  onChange={(e) => setCustomMg(e.target.value)}
                />
                <span className="unit">mg</span>
              </div>
            )}

            <button
              className="button primary"
              onClick={addCoffee}
              disabled={isAddDisabled}
            >
              + Add
            </button>
          </div>

          <div className="coffee-list-container card">
            <div className="list-header">
              <h3>Added Drinks</h3>
            </div>

            {entries.length === 0 ? (
              <div className="empty">
                <span className="empty-dot" /> No drinks added yet.
              </div>
            ) : (
              <ul className="list">
                {entries.map((e, index) => (
                  <li key={`${e.time}-${index}`} className="entry-item">
                    <div className="entry-info">
                      <span className="pill time">{e.time}</span>
                      <span className="entry-drink">{e.label}</span>
                      <span className="pill mg">{e.caffeineMg}mg</span>
                    </div>
                    <button
                      className="icon-btn danger"
                      onClick={() => removeEntry(index)}
                      aria-label="Remove entry"
                      title="Remove"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="right card">
          <div className="chart-header">
            <h3>Caffeine Level</h3>
            <span className="muted">Half-life ≈ {HALF_LIFE_HOURS}h</span>
          </div>

          {entries.length === 0 ? (
            <div className="empty">
              <span className="empty-dot" /> Add a drink to see the curve.
            </div>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <defs>
                    <linearGradient id="caffLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#E6B17E" />
                      <stop offset="100%" stopColor="#C08552" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#ffffff22" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--panel)",
                      border: "1px solid var(--line)",
                      color: "var(--text)",
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="caffeine"
                    stroke="url(#caffLine)"
                    strokeWidth={3}
                    dot={{ r: 2, fill: "#E6B17E" }}
                    activeDot={{ r: 5, fill: "#C08552" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;