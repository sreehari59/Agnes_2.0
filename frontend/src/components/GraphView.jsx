import KnowledgeGraph from './KnowledgeGraph'
import './KnowledgeGraph.css'

export default function GraphView() {
  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Interactive Knowledge Graph</h1>
      <div className="card" style={{ padding: '1rem' }}>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Explore the full supply chain network with our enhanced interactive visualization.
        </p>
        <div style={{ height: '800px', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          <KnowledgeGraph />
        </div>
      </div>
    </div>
  )
}
