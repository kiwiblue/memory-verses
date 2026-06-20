export default function VersionSelector({ version, onChange }) {
  return (
    <select value={version} onChange={e => onChange(e.target.value)}>
      <option value="esv">ESV</option>
      <option value="kjv">KJV</option>
      <option value="niv">NIV</option>
      <option value="nlt">NLT</option>
    </select>
  );
}
