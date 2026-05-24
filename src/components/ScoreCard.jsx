export default function ScoreCard({ label, value, tone = 'default' }) {
  return (
    <div className={`score-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
