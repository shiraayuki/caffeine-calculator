import { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import "./App.css";

type Entry = {
  id: string;
  time: string;         
  label: string;      
  caffeineMg: number; 
  volumeMl?: number;
};

const PRESET_DRINKS = [
  { label: "Espresso", mgPer100ml: 200, defaultMl: 40 },
  { label: "Coffee (Filter)", mgPer100ml: 40, defaultMl: 250 },
  { label: "Black Tea", mgPer100ml: 22, defaultMl: 250 },
  { label: "Green Tea", mgPer100ml: 15, defaultMl: 250 },
  { label: "Energy Drink", mgPer100ml: 32, defaultMl: 500 },
  { label: "Mate", mgPer100ml: 20, defaultMl: 500 },
  { label: "Cola", mgPer100ml: 10, defaultMl: 330 },
  { label: "Cold Brew", mgPer100ml: 80, defaultMl: 250 },
];

function App() {
  // --- States with LocalStorage Initialization ---
  const [entries, setEntries] = useState<Entry[]>(() => {
    const saved = localStorage.getItem("caff_entries");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [halfLife, setHalfLife] = useState<number>(() => {
    const saved = localStorage.getItem("caff_halfLife");
    return saved ? Number(saved) : 5;
  });

  const [sleepTime, setSleepTime] = useState(() => localStorage.getItem("caff_sleep") || "23:00");
  const [wakeTime, setWakeTime] = useState(() => localStorage.getItem("caff_wake") || "07:00");
  
  const [includeCarryOver, setIncludeCarryOver] = useState(() => {
    return localStorage.getItem("caff_carryOver") === "true";
  });

  const [showMelatonin, setShowMelatonin] = useState(true);

  // --- Temporary Form States ---
  const [time, setTime] = useState("");
  const [drinkLabel, setDrinkLabel] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [customMg, setCustomMg] = useState<string>("");
  const [volumeMl, setVolumeMl] = useState<string>("");
  const [mgPer100ml, setMgPer100ml] = useState<string>("");

  // --- Persistence Effects ---
  useEffect(() => { localStorage.setItem("caff_entries", JSON.stringify(entries)); }, [entries]);
  useEffect(() => { localStorage.setItem("caff_halfLife", halfLife.toString()); }, [halfLife]);
  useEffect(() => { localStorage.setItem("caff_sleep", sleepTime); }, [sleepTime]);
  useEffect(() => { localStorage.setItem("caff_wake", wakeTime); }, [wakeTime]);
  useEffect(() => { localStorage.setItem("caff_carryOver", includeCarryOver.toString()); }, [includeCarryOver]);

  const timeOptions = useMemo(() => {
    const out: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 15, 30, 45]) {
        out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return out;
  }, []);

  const selectedPreset = PRESET_DRINKS.find(d => d.label === drinkLabel);
  
  const handleDrinkChange = (label: string) => {
    setDrinkLabel(label);
    const preset = PRESET_DRINKS.find(d => d.label === label);
    if (preset) {
      setVolumeMl(preset.defaultMl.toString());
      setMgPer100ml(preset.mgPer100ml.toString());
    } else {
      setVolumeMl("");
      setMgPer100ml("");
    }
  };

  const volumeNum = Number(volumeMl) || 0;
  const mgPer100mlNum = Number(mgPer100ml) || 0;
  const calculatedMg = selectedPreset ? Math.round((mgPer100mlNum / 100) * volumeNum) : 0;
  const customMgNum = Number.isFinite(Number(customMg)) ? Number(customMg) : 0;
  
  const isAddDisabled = !time || (useCustom && customMgNum <= 0) || (!useCustom && (!selectedPreset || volumeNum <= 0 || mgPer100mlNum <= 0));

  const addCoffee = () => {
    if (isAddDisabled) return;
    const entry: Entry = useCustom
      ? { id: Math.random().toString(36).substr(2, 9), time, label: `Custom ${customMgNum}mg`, caffeineMg: customMgNum }
      : { id: Math.random().toString(36).substr(2, 9), time, label: `${selectedPreset!.label} (${volumeNum}ml)`, caffeineMg: calculatedMg, volumeMl: volumeNum };

    setEntries(prev => [...prev, entry]);
    setTime("");
    setVolumeMl("");
    setMgPer100ml("");
    if (useCustom) setCustomMg(""); else setDrinkLabel("");
  };

  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const parseTimeToHours = (t: string) => {
    const [hh, mm] = t.split(":").map(Number);
    return hh + mm / 60;
  };

  const calculateCaffeineCurve = () => {
    const data: any[] = [];
    const sleepH = parseTimeToHours(sleepTime);
    const wakeH = parseTimeToHours(wakeTime);
    
    let sleepDuration = wakeH - sleepH;
    if (sleepDuration < 0) sleepDuration += 24;
    const peakH = (sleepH + sleepDuration / 2) % 24;

    for (let i = 0; i < 24 * 4; i++) {
      const h = i / 4;
      let sum = 0;
      
      entries.forEach(e => {
        const tEntry = parseTimeToHours(e.time);
        const diffToday = h - tEntry;
        if (diffToday >= 0) {
          sum += e.caffeineMg * Math.pow(0.5, diffToday / halfLife);
        }
        if (includeCarryOver) {
          const diffYesterday = h - (tEntry - 24);
          sum += e.caffeineMg * Math.pow(0.5, diffYesterday / halfLife);
        }
      });

      let distToPeak = Math.abs(h - peakH);
      if (distToPeak > 12) distToPeak = 24 - distToPeak;
      
      const sigma = sleepDuration / 3; 
      const melatonin = Math.exp(-Math.pow(distToPeak, 2) / (2 * Math.pow(sigma, 2))) * 100;

      const displayH = Math.floor(h);
      const displayM = (h % 1) * 60;
      const timeStr = `${String(displayH).padStart(2, "0")}:${String(displayM).padStart(2, "0")}`;

      data.push({
        time: timeStr,
        caffeine: Math.round(sum),
        melatonin: Math.round(melatonin),
      });
    }
    return data;
  };

  const chartData = useMemo(calculateCaffeineCurve, [entries, halfLife, sleepTime, wakeTime, includeCarryOver]);
  const totalMg = entries.reduce((acc, e) => acc + e.caffeineMg, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="label">{`${label}`}</p>
          <p style={{ color: "#E6B17E" }}>Caffeine: {data.caffeine} mg</p>
          {showMelatonin && <p style={{ color: "#9B59B6" }}>Melatonin: {data.melatonin} %</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="main-container">
      <div className="header">
        <h1>Caffeine Calculator</h1>
        <div className="header-meta">
          <div className="settings-group">
            <div className="setting-item">
              <label>Half-life:</label>
              <select className="mini-select" value={halfLife} onChange={(e) => setHalfLife(Number(e.target.value))}>
                {[3, 3.5, 4, 4.5, 5, 5.5, 6].map(v => <option key={v} value={v}>{v}h</option>)}
              </select>
            </div>
            <div className="setting-divider" />
            <div className="setting-item">
              <label>Sleep:</label>
              <select className="mini-select" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)}>
                {timeOptions.filter((_, i) => i % 4 === 0).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="setting-item">
              <label>Wake:</label>
              <select className="mini-select" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)}>
                {timeOptions.filter((_, i) => i % 4 === 0).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="setting-divider" />
            <div className="setting-item">
              <label>Carry-over:</label>
              <label className="toggle small-toggle">
                <input type="checkbox" checked={includeCarryOver} onChange={(e) => setIncludeCarryOver(e.target.checked)} />
                <span />
              </label>
            </div>
          </div>
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
              <select className="select" value={time} onChange={(e) => setTime(e.target.value)}>
                <option value="">Select time</option>
                {timeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="input-row">
              <label className="label">Mode</label>
              <div className="toggle-wrap">
                <label className="toggle"><input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} /><span /></label>
                <span className="muted">{useCustom ? "Custom (mg)" : "Preset"}</span>
              </div>
            </div>
            {!useCustom ? (
              <>
                <div className="input-row">
                  <label className="label">Drink</label>
                  <select className="select" value={drinkLabel} onChange={(e) => handleDrinkChange(e.target.value)}>
                    <option value="">Select drink</option>
                    {PRESET_DRINKS.map(d => <option key={d.label} value={d.label}>{d.label}</option>)}
                  </select>
                </div>
                {selectedPreset && (
                  <>
                    <div className="input-row">
                      <label className="label">Volume</label>
                      <input className="input" type="number" placeholder="e.g. 250" min={1} max={2000} value={volumeMl} onChange={(e) => setVolumeMl(e.target.value)} />
                      <span className="unit">ml</span>
                    </div>
                    <div className="input-row">
                      <label className="label">mg/100ml</label>
                      <input className="input" type="number" placeholder="e.g. 40" min={1} max={1000} value={mgPer100ml} onChange={(e) => setMgPer100ml(e.target.value)} />
                      <span className="unit">mg</span>
                    </div>
                    <div className="input-row info-row">
                      <span className="muted">Calculated: <strong>{calculatedMg} mg</strong> Caffeine</span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="input-row">
                <label className="label">Amount</label>
                <input className="input" type="number" placeholder="e.g. 120" min={1} max={1000} step={5} value={customMg} onChange={(e) => setCustomMg(e.target.value)} />
                <span className="unit">mg</span>
              </div>
            )}
            <button className="button primary" onClick={addCoffee} disabled={isAddDisabled}>+ Add</button>
          </div>

          <div className="coffee-list-container card">
            <div className="list-header"><h3>Added Drinks</h3></div>
            {entries.length === 0 ? (
              <div className="empty"><span className="empty-dot" /> No drinks added yet.</div>
            ) : (
              <ul className="list">
                {entries.map((e, index) => (
                  <li key={e.id} className="entry-item">
                    <div className="entry-info">
                      <span className="pill time">{e.time}</span>
                      <span className="entry-drink">{e.label}</span>
                      <span className="pill mg">{e.caffeineMg}mg</span>
                    </div>
                    <button className="icon-btn danger" onClick={() => removeEntry(index)}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="right card">
          <div className="chart-header">
            <div>
              <h3>Caffeine vs. Melatonin</h3>
              <span className="muted">Personalized Rhythm {includeCarryOver ? "(incl. carry-over)" : ""}</span>
            </div>
            <div className="toggle-wrap">
              <span className="muted small">Show Melatonin</span>
              <label className="toggle">
                <input type="checkbox" checked={showMelatonin} onChange={(e) => setShowMelatonin(e.target.checked)} />
                <span />
              </label>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 25, right: 8, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="caffLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#E6B17E" /><stop offset="100%" stopColor="#C08552" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff22" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: "var(--text-muted)", fontSize: 12 }} interval={7} />
                <YAxis yAxisId="left" tick={{ fill: "#E6B17E", fontSize: 12 }} width={36} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#9B59B6", fontSize: 12 }} width={36} hide={!showMelatonin} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine yAxisId="left" x={sleepTime} stroke="#5DADE2" strokeDasharray="4 4" label={{ position: 'top', value: 'Sleep', fill: '#5DADE2', fontSize: 11, fontWeight: 'bold' }} />
                <ReferenceLine yAxisId="left" x={wakeTime} stroke="#27ae60" strokeDasharray="4 4" label={{ position: 'top', value: 'Wake', fill: '#27ae60', fontSize: 11, fontWeight: 'bold' }} />
                <Line yAxisId="left" type="monotone" dataKey="caffeine" stroke="url(#caffLine)" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#C08552" }} />
                {showMelatonin && <Line yAxisId="right" type="monotone" dataKey="melatonin" stroke="#9B59B6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="melatonin" />}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="dot caffeine" /> Caffeine (mg)</span>
            <span className="legend-item"><span className="dot melatonin" /> Melatonin (%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;