import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import MultiSelectFilter from './MultiSelectFilter'

// ─── Constants ───
const NODE_COLORS = { Company: '#818cf8', FinishedGood: '#34d399', RawMaterial: '#ef4444', Supplier: '#fbbf24', Category: '#f472b6' }
const LINK_COLORS = { MANUFACTURED_BY: '#818cf8', SUPPLIES: '#fb923c', USES_MATERIAL: '#c084fc', HAS_CATEGORY: '#f472b6', SIMILAR_PRODUCT: '#f97316', SHARED_SUPPLIER: '#38bdf8' }

const VIEW_LABELS = {
  'full-chain': 'Full Supply Chain View',
  materials: 'Bill of Materials View',
  risk: 'Risk & Concentration View',
  products: 'Product Intelligence View',
}

const VIEW_INSIGHTS = {
  'full-chain': [
    { title: 'Complete Traceability', value: 'All 876 raw materials shown with full supply chain', sub: 'Company → FG → RM → Supplier' },
    { title: 'Dominant Supplier', value: 'Prinova USA supplies 408 RMs to 60 companies', sub: 'Critical supply chain dependency' },
    { title: 'Supply Risk', value: '119 raw materials have single-source risk', sub: 'No backup supplier available' },
    { title: '💰 Pricing Data', value: '33 products with pricing ($2.28-$45.00)', sub: 'Avg price: $21.09 | Click products to see prices' },
  ],
  materials: [
    { title: 'Most Used RM', value: 'Magnesium stearate appears in 12 finished goods', sub: 'Top hub ingredient' },
    { title: 'BOM Complexity', value: 'Avg 10.3 raw materials per finished good', sub: 'Range: 2 to 48 materials' },
    { title: 'Critical Materials', value: 'Top 50 hub materials shown', sub: 'Click to see which products use them' },
    { title: 'Single-Source', value: 'Red materials have only 1 supplier', sub: 'Supply disruption risk' },
  ],
  risk: [
    { title: 'Highest Risk', value: 'Orgain whey vanilla: 54% single-source', sub: '7 of 13 materials from one supplier' },
    { title: '💰 Price-Risk Link', value: 'High-risk products avg $29.97 vs $18.97 low-risk', sub: 'Single-source materials may increase costs' },
    { title: 'Critical RMs', value: '119 raw materials have no backup', sub: 'Single supplier dependency' },
    { title: 'Brand Risk', value: 'Optimum Nutrition: 42-44% single-source', sub: 'Multiple products affected' },
  ],
  products: [
    { title: 'Identical Formulas', value: 'Equate products share 44 identical RMs', sub: 'Same formula, different packaging' },
    { title: '💰 Whey Protein', value: 'Avg $28.72 ($21.98-$29.97)', sub: 'Premium category pricing' },
    { title: 'Category Leaders', value: 'Nature Made: 6 product categories', sub: 'Highest diversity' },
    { title: 'Certifications', value: '100% of whey proteins are gluten-free', sub: 'Category-wide standard' },
  ],
}

function nodeRadius(d) {
  if (d.type === 'Company') return Math.max(10, Math.min(24, 6 + (d.fgCount || 0) * 1.2))
  if (d.type === 'Supplier') return Math.max(8, Math.min(18, 6 + (d.companyCount || 0) * 0.8))
  if (d.type === 'RawMaterial') return Math.max(4, Math.min(12, 3 + (d.usageCount || 0) * 0.6))
  if (d.type === 'Category') return 14
  if (d.type === 'FinishedGood' && d.riskLevel === 'high') return 7
  if (d.type === 'FinishedGood') return 6
  return 5
}

function getDefaultLinkOpacity(type) {
  if (type === 'MANUFACTURED_BY') return 0.12
  if (type === 'USES_MATERIAL') return 0.3
  if (type === 'SUPPLIES') return 0.25
  if (type === 'HAS_CATEGORY') return 0.2
  if (type === 'SIMILAR_PRODUCT') return 0.4
  return 0.15
}

// ─── Graph data builder ───
function buildGraphData(data, view) {
  const nodes = []
  const links = []
  const nodeMap = new Map()

  function addNode(id, type, label, extra = {}) {
    if (nodeMap.has(id)) return nodeMap.get(id)
    const n = { id, type, label, ...extra }
    nodes.push(n)
    nodeMap.set(id, n)
    return n
  }

  // Always add companies
  data.companies.forEach((c) => {
    const sc = data.company_supply_chains[c.id]
    addNode(`c-${c.id}`, 'Company', c.name, {
      entityId: c.id,
      fgCount: sc ? sc.fg_count : 0,
      rmCount: sc ? sc.rm_count : 0,
      supplierCount: sc ? sc.supplier_count : 0,
    })
  })

  if (view === 'full-chain') {
    data.finished_goods.forEach((fg) => {
      const meta = data.product_metadata[fg.id] || {}
      addNode(`fg-${fg.id}`, 'FinishedGood', fg.sku.replace(/^FG-/, '').substring(0, 30), {
        entityId: fg.id, sku: fg.sku, companyId: fg.company_id,
        category: meta.category, brand: meta.brand, productName: meta.product_name,
      })
      links.push({ source: `fg-${fg.id}`, target: `c-${fg.company_id}`, type: 'MANUFACTURED_BY' })
    })

    const usedRMs = new Set()
    Object.values(data.fg_to_rms).forEach((rmIds) => rmIds.forEach((rmId) => usedRMs.add(rmId)))

    usedRMs.forEach((rmId) => {
      const rm = data.raw_materials.find((r) => r.id === rmId)
      if (rm) {
        const suppliers = data.rm_to_suppliers[rmId] || []
        const usageCount = data.critical_raw_materials.find(([id]) => id === rmId)?.[1] || 1
        addNode(`rm-${rmId}`, 'RawMaterial', rm.sku.replace(/^RM-/, '').substring(0, 28), {
          entityId: rmId, sku: rm.sku, usageCount,
          supplierCount: suppliers.length, isSingleSource: suppliers.length === 1,
        })
      }
    })

    Object.entries(data.fg_to_rms).forEach(([fgId, rmIds]) => {
      rmIds.forEach((rmId) => {
        if (nodeMap.has(`fg-${fgId}`) && nodeMap.has(`rm-${rmId}`))
          links.push({ source: `fg-${fgId}`, target: `rm-${rmId}`, type: 'USES_MATERIAL' })
      })
    })

    data.suppliers.forEach((s) => {
      const reach = data.supplier_reach[s.id]
      addNode(`s-${s.id}`, 'Supplier', s.name, {
        entityId: s.id, rmCount: reach ? reach.rm_count : 0,
        fgCount: reach ? reach.fg_count : 0, companyCount: reach ? reach.company_count : 0,
      })
    })

    Object.entries(data.rm_to_suppliers).forEach(([rmId, supplierIds]) => {
      if (nodeMap.has(`rm-${rmId}`)) {
        supplierIds.forEach((sid) => {
          if (nodeMap.has(`s-${sid}`))
            links.push({ source: `s-${sid}`, target: `rm-${rmId}`, type: 'SUPPLIES' })
        })
      }
    })
  } else if (view === 'materials') {
    data.finished_goods.forEach((fg) => {
      const meta = data.product_metadata[fg.id] || {}
      addNode(`fg-${fg.id}`, 'FinishedGood', fg.sku.replace(/^FG-/, '').substring(0, 30), {
        entityId: fg.id, sku: fg.sku, companyId: fg.company_id, category: meta.category,
      })
      links.push({ source: `fg-${fg.id}`, target: `c-${fg.company_id}`, type: 'MANUFACTURED_BY' })
    })

    const hubRMs = data.critical_raw_materials.slice(0, 40)
    hubRMs.forEach(([rmId, usageCount]) => {
      const rm = data.raw_materials.find((r) => r.id === rmId)
      if (rm) {
        const suppliers = data.rm_to_suppliers[rmId] || []
        addNode(`rm-${rmId}`, 'RawMaterial', rm.sku.replace(/^RM-/, '').substring(0, 28), {
          entityId: rmId, usageCount, supplierCount: suppliers.length, isSingleSource: suppliers.length === 1,
        })
      }
    })

    Object.entries(data.fg_to_rms).forEach(([fgId, rmIds]) => {
      rmIds.forEach((rmId) => {
        if (nodeMap.has(`fg-${fgId}`) && nodeMap.has(`rm-${rmId}`))
          links.push({ source: `fg-${fgId}`, target: `rm-${rmId}`, type: 'USES_MATERIAL' })
      })
    })
  } else if (view === 'risk') {
    data.suppliers.forEach((s) => {
      const reach = data.supplier_reach[s.id]
      addNode(`s-${s.id}`, 'Supplier', s.name, {
        entityId: s.id, companyCount: reach ? reach.company_count : 0,
      })
    })

    data.high_risk_finished_goods.forEach((fg) => {
      const meta = data.product_metadata[fg.fg_id] || {}
      const riskLevel = fg.risk_ratio >= 0.4 ? 'high' : fg.risk_ratio >= 0.2 ? 'medium' : 'low'
      addNode(`fg-${fg.fg_id}`, 'FinishedGood', fg.sku.replace(/^FG-/, '').substring(0, 30), {
        entityId: fg.fg_id, sku: fg.sku,
        companyId: data.finished_goods.find((f) => f.id === fg.fg_id)?.company_id,
        riskRatio: fg.risk_ratio, riskLevel,
        singleSourceCount: fg.single_source_rms, totalRM: fg.total_rms, category: meta.category,
      })
      const cid = data.finished_goods.find((f) => f.id === fg.fg_id)?.company_id
      if (cid) links.push({ source: `fg-${fg.fg_id}`, target: `c-${cid}`, type: 'MANUFACTURED_BY' })
    })

    const supplierCompanyLinks = {}
    Object.entries(data.supplier_to_rms).forEach(([sid, rmIds]) => {
      rmIds.forEach((rmId) => {
        const rm = data.raw_materials.find((r) => r.id === parseInt(rmId))
        if (rm) {
          const key = `${sid}-${rm.company_id}`
          supplierCompanyLinks[key] = (supplierCompanyLinks[key] || 0) + 1
        }
      })
    })

    Object.entries(supplierCompanyLinks).forEach(([key, weight]) => {
      if (weight >= 3) {
        const [sid, cid] = key.split('-').map(Number)
        if (nodeMap.has(`s-${sid}`) && nodeMap.has(`c-${cid}`))
          links.push({ source: `s-${sid}`, target: `c-${cid}`, type: 'SUPPLIES', weight })
      }
    })
  } else if (view === 'products') {
    const categories = new Set()
    data.finished_goods.forEach((fg) => {
      const meta = data.product_metadata[fg.id] || {}
      if (meta.category && meta.category !== 'unknown' && meta.category !== 'scrape_failed' && meta.category !== 'blocked_page')
        categories.add(meta.category)

      addNode(`fg-${fg.id}`, 'FinishedGood', fg.sku.replace(/^FG-/, '').substring(0, 30), {
        entityId: fg.id, sku: fg.sku, companyId: fg.company_id,
        category: meta.category, brand: meta.brand, productName: meta.product_name,
      })
      links.push({ source: `fg-${fg.id}`, target: `c-${fg.company_id}`, type: 'MANUFACTURED_BY' })

      if (meta.category && categories.has(meta.category)) {
        const catId = `cat-${meta.category}`
        if (!nodeMap.has(catId))
          addNode(catId, 'Category', meta.category.replace(/_/g, ' '), { categoryName: meta.category })
        links.push({ source: `fg-${fg.id}`, target: catId, type: 'HAS_CATEGORY' })
      }
    })

    ;(data.product_similarity || []).forEach(([a, b, count, jacc]) => {
      if (jacc >= 0.7 && nodeMap.has(`fg-${a}`) && nodeMap.has(`fg-${b}`))
        links.push({ source: `fg-${a}`, target: `fg-${b}`, type: 'SIMILAR_PRODUCT', weight: count, jaccard: jacc })
    })
  }

  // Build adjacency
  const adjacency = new Map()
  links.forEach((link, i) => {
    const s = typeof link.source === 'object' ? link.source.id : link.source
    const t = typeof link.target === 'object' ? link.target.id : link.target
    if (!adjacency.has(s)) adjacency.set(s, [])
    if (!adjacency.has(t)) adjacency.set(t, [])
    adjacency.get(s).push({ linkIdx: i, neighbor: t })
    adjacency.get(t).push({ linkIdx: i, neighbor: s })
  })

  return { nodes, links, nodeMap, adjacency }
}

// ─── Details Panel Content Builder ───
function buildDetailsHTML(d, adjacency, allLinks, nodeMap, data) {
  let html = '<h3>Selected Node</h3>'
  html += `<div class="detail-card"><div class="label">Type</div><div class="value" style="color:${NODE_COLORS[d.type]}">${d.type}</div></div>`
  html += `<div class="detail-card"><div class="label">Name</div><div class="value">${d.label}</div></div>`

  if (d.productName) html += `<div class="detail-card"><div class="label">Product</div><div class="value" style="font-size:11px">${d.productName}</div></div>`
  if (d.sku) html += `<div class="detail-card"><div class="label">SKU</div><div class="value" style="font-size:10px">${d.sku}</div></div>`
  if (d.brand) html += `<div class="detail-card"><div class="label">Brand</div><div class="value">${d.brand}</div></div>`
  if (d.category) html += `<div class="detail-card"><div class="label">Category</div><div class="value">${d.category.replace(/_/g, ' ')}</div></div>`

  const meta = data.product_metadata[d.entityId]
  if (meta && meta.price_usd)
    html += `<div class="detail-card" style="background:#1a3a1a;border-left:3px solid #6ee7b7"><div class="label">💰 Price</div><div class="value" style="color:#6ee7b7;font-weight:700">$${meta.price_usd.toFixed(2)}</div></div>`

  if (meta && meta.dietary_flags) {
    try {
      const flags = JSON.parse(meta.dietary_flags)
      if (flags.length > 0) {
        html += '<div class="detail-card"><div class="label">Certifications</div><div class="value">'
        flags.forEach((f) => (html += `<span class="cert-badge">${f.replace(/_/g, ' ')}</span>`))
        html += '</div></div>'
      }
    } catch (e) { /* ignore */ }
  }

  if (d.fgCount) html += `<div class="detail-card"><div class="label">Products</div><div class="value">${d.fgCount} finished goods</div></div>`
  if (d.rmCount) html += `<div class="detail-card"><div class="label">Raw Materials</div><div class="value">${d.rmCount} materials</div></div>`
  if (d.supplierCount && d.type === 'Company') html += `<div class="detail-card"><div class="label">Suppliers</div><div class="value">${d.supplierCount} suppliers</div></div>`
  if (d.companyCount) html += `<div class="detail-card"><div class="label">Reach</div><div class="value">Serves ${d.companyCount} companies</div></div>`
  if (d.usageCount) html += `<div class="detail-card"><div class="label">Usage</div><div class="value">Used in ${d.usageCount} finished goods</div></div>`
  if (d.supplierCount && d.type === 'RawMaterial') {
    const cls = d.isSingleSource ? 'risk-high' : 'risk-low'
    const label = d.isSingleSource ? '⚠️ SINGLE-SOURCE' : `✓ ${d.supplierCount} suppliers`
    html += `<div class="detail-card"><div class="label">Supply Risk</div><div class="value"><span class="risk-badge ${cls}">${label}</span></div></div>`
  }
  if (d.riskRatio > 0) {
    const cls = d.riskLevel === 'high' ? 'risk-high' : d.riskLevel === 'medium' ? 'risk-med' : 'risk-low'
    html += `<div class="detail-card"><div class="label">Supply Risk</div><div class="value"><span class="risk-badge ${cls}">${(d.riskRatio * 100).toFixed(0)}% single-source</span> (${d.singleSourceCount}/${d.totalRM} materials)</div></div>`
  }

  const adj = adjacency.get(d.id) || []
  if (adj.length > 0) {
    const groups = {}
    adj.forEach(({ linkIdx, neighbor }) => {
      const link = allLinks[linkIdx]
      const n = nodeMap.get(neighbor)
      if (!n) return
      const t = link.type
      if (!groups[t]) groups[t] = []
      groups[t].push({ node: n, link })
    })

    Object.entries(groups).forEach(([type, items]) => {
      items.sort((a, b) => (b.link.weight || 0) - (a.link.weight || 0))
      html += `<h3 style="margin-top:10px">${type.replace(/_/g, ' ')} <span style="color:#4b5563">(${items.length})</span></h3>`
      html += '<ul class="connection-list">'
      items.slice(0, 50).forEach(({ node: n, link }) => {
        let extra = ''
        if (link.jaccard !== undefined) extra = `<span class="rel-type">${(link.jaccard * 100).toFixed(0)}% match</span>`
        else if (link.weight > 1) extra = `<span class="rel-type">${link.weight} materials</span>`
        const fillColor = n.type === 'FinishedGood' && n.riskLevel === 'high' ? '#ef4444' : n.type === 'RawMaterial' && n.isSingleSource ? '#dc2626' : NODE_COLORS[n.type]
        html += `<li data-node-id="${n.id}"><span style="width:8px;height:8px;border-radius:50%;background:${fillColor};display:inline-block;flex-shrink:0"></span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.label}</span>${extra}</li>`
      })
      if (items.length > 50) html += `<li style="color:#6b7280;font-style:italic">... and ${items.length - 50} more</li>`
      html += '</ul>'
    })
  }
  return html
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function KnowledgeGraph() {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const tooltipRef = useRef(null)
  const detailsRef = useRef(null)
  const simulationRef = useRef(null)
  const graphStateRef = useRef({
    nodeElements: null,
    linkElements: null,
    selectedNode: null,
    allNodes: [],
    allLinks: [],
    nodeMap: new Map(),
    adjacency: new Map(),
    data: null,
    currentView: 'full-chain',
    activeFilters: { certifications: new Set(), companies: new Set(), suppliers: new Set(), finishedGoods: new Set(), rawMaterials: new Set() },
  })

  const [currentView, setCurrentView] = useState('full-chain')
  const [legendItems, setLegendItems] = useState([])
  const [edgeItems, setEdgeItems] = useState([])
  const [insights, setInsights] = useState([])
  const [stats, setStats] = useState('')
  const [dataLoaded, setDataLoaded] = useState(false)
  const [certifications, setCertifications] = useState([])
  const [companyOptions, setCompanyOptions] = useState([])
  const [supplierOptions, setSupplierOptions] = useState([])
  const [fgOptions, setFgOptions] = useState([])
  const [rmOptions, setRmOptions] = useState([])
  const [selectedCompanies, setSelectedCompanies] = useState(new Set())
  const [selectedSuppliers, setSelectedSuppliers] = useState(new Set())
  const [selectedFGs, setSelectedFGs] = useState(new Set())
  const [selectedRMs, setSelectedRMs] = useState(new Set())
  const [activeCertFilters, setActiveCertFilters] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [subtitle, setSubtitle] = useState('')

  // ─── Compute filter-visible nodes/links (shared by all interactions) ───
  const getFilterVisibility = useCallback(() => {
    const gs = graphStateRef.current
    const { activeFilters } = gs
    const data = gs.data
    if (!data) return null

    const hasFilters = activeFilters.certifications.size > 0 ||
      activeFilters.companies.size > 0 || activeFilters.suppliers.size > 0 ||
      activeFilters.finishedGoods.size > 0 || activeFilters.rawMaterials.size > 0
    if (!hasFilters) return null // null = everything visible

    const visibleNodes = new Set()
    const visibleLinks = new Set()

    const addCompanyChain = (companyId) => {
      visibleNodes.add(`c-${companyId}`)
      data.finished_goods.forEach((fg) => {
        if (fg.company_id === companyId) {
          visibleNodes.add(`fg-${fg.id}`)
          visibleLinks.add(`fg-${fg.id}|c-${companyId}`)
          const rmIds = data.fg_to_rms[fg.id] || []
          rmIds.forEach((rmId) => {
            visibleNodes.add(`rm-${rmId}`)
            visibleLinks.add(`fg-${fg.id}|rm-${rmId}`)
            ;(data.rm_to_suppliers[rmId] || []).forEach((sid) => {
              visibleNodes.add(`s-${sid}`)
              visibleLinks.add(`s-${sid}|rm-${rmId}`)
            })
          })
        }
      })
    }
    const addFGChain = (fgId) => {
      const fg = data.finished_goods.find((f) => f.id === fgId)
      if (!fg) return
      visibleNodes.add(`fg-${fgId}`)
      visibleNodes.add(`c-${fg.company_id}`)
      visibleLinks.add(`fg-${fgId}|c-${fg.company_id}`)
      ;(data.fg_to_rms[fgId] || []).forEach((rmId) => {
        visibleNodes.add(`rm-${rmId}`)
        visibleLinks.add(`fg-${fgId}|rm-${rmId}`)
        ;(data.rm_to_suppliers[rmId] || []).forEach((sid) => {
          visibleNodes.add(`s-${sid}`)
          visibleLinks.add(`s-${sid}|rm-${rmId}`)
        })
      })
    }
    const addRMChain = (rmId) => {
      visibleNodes.add(`rm-${rmId}`)
      ;(data.rm_to_suppliers[rmId] || []).forEach((sid) => {
        visibleNodes.add(`s-${sid}`)
        visibleLinks.add(`s-${sid}|rm-${rmId}`)
      })
      data.finished_goods.forEach((fg) => {
        if ((data.fg_to_rms[fg.id] || []).includes(rmId)) {
          visibleNodes.add(`fg-${fg.id}`)
          visibleLinks.add(`fg-${fg.id}|rm-${rmId}`)
          visibleNodes.add(`c-${fg.company_id}`)
          visibleLinks.add(`fg-${fg.id}|c-${fg.company_id}`)
        }
      })
    }
    const addSupplierChain = (supplierId) => {
      visibleNodes.add(`s-${supplierId}`)
      ;(data.supplier_to_rms[supplierId] || []).forEach((rmId) => {
        visibleNodes.add(`rm-${rmId}`)
        visibleLinks.add(`s-${supplierId}|rm-${rmId}`)
        data.finished_goods.forEach((fg) => {
          if ((data.fg_to_rms[fg.id] || []).includes(rmId)) {
            visibleNodes.add(`fg-${fg.id}`)
            visibleLinks.add(`fg-${fg.id}|rm-${rmId}`)
            visibleNodes.add(`c-${fg.company_id}`)
            visibleLinks.add(`fg-${fg.id}|c-${fg.company_id}`)
          }
        })
      })
    }

    if (activeFilters.companies.size > 0) activeFilters.companies.forEach(addCompanyChain)
    if (activeFilters.finishedGoods.size > 0) activeFilters.finishedGoods.forEach(addFGChain)
    if (activeFilters.rawMaterials.size > 0) activeFilters.rawMaterials.forEach(addRMChain)
    if (activeFilters.suppliers.size > 0) activeFilters.suppliers.forEach(addSupplierChain)

    if (activeFilters.certifications.size > 0) {
      const certMatchingFGs = new Set()
      Object.entries(data.product_metadata || {}).forEach(([pid, meta]) => {
        if (meta.dietary_flags) {
          try {
            const flags = JSON.parse(meta.dietary_flags)
            if (flags.some((f) => activeFilters.certifications.has(f)))
              certMatchingFGs.add(`fg-${pid}`)
          } catch (e) { /* ignore */ }
        }
      })
      if (visibleNodes.size > 0) {
        for (const nodeId of [...visibleNodes]) {
          if (nodeId.startsWith('fg-') && !certMatchingFGs.has(nodeId))
            visibleNodes.delete(nodeId)
        }
      } else {
        data.companies.forEach((c) => visibleNodes.add(`c-${c.id}`))
        data.suppliers.forEach((s) => visibleNodes.add(`s-${s.id}`))
        data.raw_materials.forEach((rm) => visibleNodes.add(`rm-${rm.id}`))
        certMatchingFGs.forEach((id) => visibleNodes.add(id))
      }
    }

    return { visibleNodes, visibleLinks }
  }, [])

  // Helper: is a link visible per filter?
  const isLinkFilterVisible = useCallback((d, filterVis) => {
    if (!filterVis) return true
    if (filterVis.visibleLinks.size === 0) return true
    const linkId = `${d.source.id}|${d.target.id}`
    const rev = `${d.target.id}|${d.source.id}`
    return filterVis.visibleLinks.has(linkId) || filterVis.visibleLinks.has(rev)
  }, [])

  // ─── Apply filter dimming (clears selection first) ───
  const applyFilters = useCallback(() => {
    const gs = graphStateRef.current
    const { nodeElements, linkElements } = gs
    if (!nodeElements || !linkElements) return

    // Clear any active selection so it doesn't conflict
    gs.selectedNode = null
    nodeElements.classed('selected', false).classed('neighbor', false).classed('search-match', false)
    linkElements.classed('highlighted', false)
      .attr('stroke', (d) => LINK_COLORS[d.type] || '#1f2937')
      .attr('stroke-opacity', (d) => getDefaultLinkOpacity(d.type))
    if (detailsRef.current)
      detailsRef.current.innerHTML = '<h3>Details</h3><p class="empty">Click a node to explore supply chain</p>'

    const filterVis = getFilterVisibility()
    if (!filterVis) {
      nodeElements.classed('dimmed', false)
      linkElements.classed('dimmed', false)
    } else {
      nodeElements.classed('dimmed', (d) => !filterVis.visibleNodes.has(d.id))
      linkElements.classed('dimmed', (d) => !isLinkFilterVisible(d, filterVis))
    }
  }, [getFilterVisibility, isLinkFilterVisible])

  // ─── Clear selection (preserves filter dimming) ───
  const clearSelection = useCallback(() => {
    const gs = graphStateRef.current
    gs.selectedNode = null
    if (!gs.nodeElements || !gs.linkElements) return

    // Remove selection classes
    gs.nodeElements.classed('selected', false).classed('neighbor', false).classed('search-match', false)
    gs.linkElements.classed('highlighted', false)
      .attr('stroke', (d) => LINK_COLORS[d.type] || '#1f2937')
      .attr('stroke-opacity', (d) => getDefaultLinkOpacity(d.type))
    if (detailsRef.current)
      detailsRef.current.innerHTML = '<h3>Details</h3><p class="empty">Click a node to explore supply chain</p>'

    // Re-apply filter dimming instead of clearing everything
    const filterVis = getFilterVisibility()
    if (!filterVis) {
      gs.nodeElements.classed('dimmed', false)
      gs.linkElements.classed('dimmed', false)
    } else {
      gs.nodeElements.classed('dimmed', (d) => !filterVis.visibleNodes.has(d.id))
      gs.linkElements.classed('dimmed', (d) => !isLinkFilterVisible(d, filterVis))
    }
  }, [getFilterVisibility, isLinkFilterVisible])

  // ─── Select node (respects filter visibility) ───
  const selectNode = useCallback((d) => {
    const gs = graphStateRef.current
    gs.selectedNode = d
    d3.select(tooltipRef.current).style('opacity', 0)

    // Clear all filters when clicking a node
    gs.activeFilters.companies.clear()
    gs.activeFilters.suppliers.clear()
    gs.activeFilters.finishedGoods.clear()
    gs.activeFilters.rawMaterials.clear()
    gs.activeFilters.certifications.clear()
    setSelectedCompanies(new Set())
    setSelectedSuppliers(new Set())
    setSelectedFGs(new Set())
    setSelectedRMs(new Set())
    setActiveCertFilters(new Set())

    const neighbors = new Set()
    const connectedLinks = new Set()
    ;(gs.adjacency.get(d.id) || []).forEach(({ linkIdx, neighbor }) => {
      neighbors.add(neighbor)
      connectedLinks.add(linkIdx)
    })

    gs.nodeElements.classed('selected', (n) => n.id === d.id)
      .classed('neighbor', (n) => neighbors.has(n.id))
      .classed('dimmed', (n) => n.id !== d.id && !neighbors.has(n.id))
    gs.linkElements.classed('highlighted', (_l, i) => connectedLinks.has(i))
      .classed('dimmed', (_l, i) => !connectedLinks.has(i))
      .attr('stroke', (l, i) => connectedLinks.has(i) ? LINK_COLORS[l.type] : '#1f2937')
      .attr('stroke-opacity', (_l, i) => connectedLinks.has(i) ? 0.85 : 0.02)

    if (detailsRef.current) {
      detailsRef.current.innerHTML = buildDetailsHTML(d, gs.adjacency, gs.allLinks, gs.nodeMap, gs.data)
      detailsRef.current.querySelectorAll('.connection-list li').forEach((li) => {
        li.addEventListener('click', () => {
          const n = gs.nodeMap.get(li.dataset.nodeId)
          if (n) selectNode(n)
        })
      })
    }
  }, [])

  // ─── Render the D3 graph ───
  const renderGraph = useCallback((view) => {
    const gs = graphStateRef.current
    const data = gs.data
    if (!data || !svgRef.current || !containerRef.current) return

    const { nodes, links, nodeMap, adjacency } = buildGraphData(data, view)
    gs.allNodes = nodes
    gs.allLinks = links
    gs.nodeMap = nodeMap
    gs.adjacency = adjacency
    gs.selectedNode = null
    gs.currentView = view

    if (detailsRef.current) detailsRef.current.innerHTML = '<h3>Details</h3><p class="empty">Click a node to explore supply chain</p>'

    const svg = d3.select(svgRef.current)
    const container = containerRef.current
    const w = container.clientWidth
    const h = container.clientHeight

    // Clear previous
    svg.selectAll('g.graph-root').remove()
    if (simulationRef.current) simulationRef.current.stop()

    const g = svg.append('g').attr('class', 'graph-root')
    const zoomBehavior = d3.zoom().scaleExtent([0.05, 10]).on('zoom', (e) => g.attr('transform', e.transform))
    svg.call(zoomBehavior)

    // Store zoom for controls
    gs.zoomBehavior = zoomBehavior

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance((d) => {
        if (d.type === 'USES_MATERIAL') return 45
        if (d.type === 'SUPPLIES') return 70
        if (d.type === 'MANUFACTURED_BY') return 60
        if (d.type === 'HAS_CATEGORY') return 80
        if (d.type === 'SIMILAR_PRODUCT') return 30 + 40 * (1 - d.jaccard)
        return 60
      }).strength((d) => {
        if (d.type === 'USES_MATERIAL') return 0.4
        if (d.type === 'SUPPLIES') return 0.15
        if (d.type === 'MANUFACTURED_BY') return 0.2
        if (d.type === 'HAS_CATEGORY') return 0.1
        if (d.type === 'SIMILAR_PRODUCT') return 0.6 * d.jaccard
        return 0.2
      }))
      .force('charge', d3.forceManyBody().strength((d) => {
        if (d.type === 'Company') return -350
        if (d.type === 'Supplier') return -220
        if (d.type === 'RawMaterial') return -100
        if (d.type === 'Category') return -280
        if (d.type === 'FinishedGood') return -50
        return -40
      }))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collision', d3.forceCollide().radius((d) => nodeRadius(d) + 3))
      .force('x', d3.forceX(w / 2).strength(0.02))
      .force('y', d3.forceY(h / 2).strength(0.02))

    simulationRef.current = simulation

    const linkG = g.append('g')
    const linkElements = linkG.selectAll('line').data(links).join('line')
      .attr('class', 'link')
      .attr('stroke-width', (d) => {
        if (d.type === 'USES_MATERIAL') return 1.5
        if (d.type === 'SUPPLIES') return Math.min(Math.max(d.weight * 0.5, 0.8), 4)
        if (d.type === 'SIMILAR_PRODUCT') return Math.max(1, d.jaccard * 4)
        return 0.8
      })
      .attr('stroke', (d) => LINK_COLORS[d.type] || '#1f2937')
      .attr('stroke-opacity', (d) => getDefaultLinkOpacity(d.type))
      .attr('stroke-dasharray', (d) => d.type === 'USES_MATERIAL' ? '3,2' : d.type === 'HAS_CATEGORY' ? '2,2' : null)

    const nodeG = g.append('g')
    const nodeElements = nodeG.selectAll('g').data(nodes).join('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
      )

    nodeElements.append('circle')
      .attr('r', nodeRadius)
      .attr('fill', (d) => {
        if (d.type === 'FinishedGood' && d.riskLevel === 'high') return '#ef4444'
        if (d.type === 'FinishedGood' && d.riskLevel === 'medium') return '#f59e0b'
        if (d.type === 'RawMaterial' && d.isSingleSource) return '#dc2626'
        return NODE_COLORS[d.type]
      })
      .attr('stroke', '#0a0e1a')
      .attr('stroke-width', 1.5)

    nodeElements.filter((d) =>
      d.type === 'Company' || d.type === 'Supplier' || d.type === 'Category' || d.type === 'RawMaterial' ||
      (view === 'risk' && d.riskLevel === 'high')
    )
      .append('text')
      .attr('class', 'node-label')
      .attr('dy', (d) => nodeRadius(d) + 13)
      .text((d) => d.label.length > 20 ? d.label.substring(0, 18) + '…' : d.label)

    // Tooltip
    const tooltip = d3.select(tooltipRef.current)
    nodeElements
      .on('mouseover', function (e, d) {
        let extra = ''
        if (d.type === 'Company') extra = `<div class="tt-extra">${d.fgCount || 0} FGs, ${d.rmCount || 0} RMs, ${d.supplierCount || 0} suppliers</div>`
        if (d.type === 'FinishedGood' && d.riskRatio > 0) extra = `<div class="tt-extra">Risk: ${(d.riskRatio * 100).toFixed(0)}% single-source</div>`
        if (d.type === 'RawMaterial') extra = `<div class="tt-extra">Used in ${d.usageCount || 0} FGs, ${d.supplierCount || 0} suppliers${d.isSingleSource ? ' ⚠️' : ''}</div>`
        if (d.type === 'Supplier') extra = `<div class="tt-extra">${d.rmCount || 0} RMs → ${d.fgCount || 0} FGs → ${d.companyCount || 0} companies</div>`
        if (d.category) extra += `<div class="tt-extra">Category: ${d.category.replace(/_/g, ' ')}</div>`
        tooltip.style('opacity', 1)
          .html(`<div class="tt-type" style="color:${NODE_COLORS[d.type]}">${d.type}</div><div class="tt-name">${d.label}</div>${extra}`)
          .style('left', (e.offsetX + 14) + 'px')
          .style('top', (e.offsetY - 12) + 'px')
      })
      .on('mousemove', function (e) {
        tooltip.style('left', (e.offsetX + 14) + 'px').style('top', (e.offsetY - 12) + 'px')
      })
      .on('mouseout', () => { tooltip.style('opacity', 0) })
      .on('click', function (e, d) { e.stopPropagation(); selectNode(d) })

    svg.on('click', () => clearSelection())

    simulation.on('tick', () => {
      linkElements.attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y)
      nodeElements.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    gs.nodeElements = nodeElements
    gs.linkElements = linkElements

    // Update stats
    setStats(`${nodes.length} nodes · ${links.length} edges`)

    // Update legend
    const typesList = view === 'products' ? ['Company', 'FinishedGood', 'Category'] :
      view === 'materials' ? ['Company', 'FinishedGood', 'RawMaterial'] :
        view === 'risk' ? ['Company', 'FinishedGood', 'Supplier'] :
          ['Company', 'FinishedGood', 'RawMaterial', 'Supplier']
    setLegendItems(typesList.map((t) => {
      const count = nodes.filter((n) => n.type === t).length
      const displayName = t === 'FinishedGood' ? 'Finished Good' : t === 'RawMaterial' ? 'Raw Material' : t
      const extra = t === 'FinishedGood' && view === 'risk' ? ' (red = high risk)' : t === 'RawMaterial' ? ' (red = single-source)' : ''
      return { type: t, displayName, extra, count, color: NODE_COLORS[t] }
    }))

    const edgeTypesList = view === 'full-chain' ? [['MANUFACTURED_BY', 'FG → Company'], ['USES_MATERIAL', 'FG → RM'], ['SUPPLIES', 'Supplier → RM']] :
      view === 'materials' ? [['MANUFACTURED_BY', 'FG → Company'], ['USES_MATERIAL', 'FG → RM']] :
        view === 'products' ? [['MANUFACTURED_BY', 'FG → Company'], ['HAS_CATEGORY', 'FG → Category'], ['SIMILAR_PRODUCT', 'Similar Formula']] :
          [['MANUFACTURED_BY', 'FG → Company'], ['SUPPLIES', 'Supplier → Company']]
    setEdgeItems(edgeTypesList.map(([type, label]) => ({ type, label, color: LINK_COLORS[type] })))

    setInsights(VIEW_INSIGHTS[view] || [])
  }, [selectNode, clearSelection])

  // ─── Switch view ───
  const switchView = useCallback((view) => {
    const gs = graphStateRef.current
    gs.activeFilters.certifications.clear()
    gs.activeFilters.companies.clear()
    gs.activeFilters.suppliers.clear()
    gs.activeFilters.finishedGoods.clear()
    gs.activeFilters.rawMaterials.clear()
    setActiveCertFilters(new Set())
    setSelectedCompanies(new Set())
    setSelectedSuppliers(new Set())
    setSelectedFGs(new Set())
    setSelectedRMs(new Set())
    setSearchQuery('')
    setCurrentView(view)
    renderGraph(view)
  }, [renderGraph])

  // ─── Load data on mount ───
  useEffect(() => {
    fetch('/new-graph/comprehensive_supply_chain.json')
      .then((r) => r.json())
      .then((data) => {
        graphStateRef.current.data = data
        setSubtitle(`Complete traceability: ${data.companies.length} companies • ${data.finished_goods.length} finished goods • ${data.raw_materials.length} raw materials • ${data.suppliers.length} suppliers`)

        // Extract filter options
        const certs = new Set()
        Object.values(data.product_metadata || {}).forEach((meta) => {
          if (meta.dietary_flags) {
            try { JSON.parse(meta.dietary_flags).forEach((f) => certs.add(f)) } catch (e) { /* ignore */ }
          }
        })
        setCertifications(Array.from(certs).sort().slice(0, 6))
        setCompanyOptions(data.companies.sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ id: c.id, label: c.name })))
        setSupplierOptions(data.suppliers.sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ id: s.id, label: s.name })))
        setFgOptions(data.finished_goods.map((fg) => {
          const meta = data.product_metadata[fg.id] || {}
          const label = meta.product_name || fg.sku
          return { id: fg.id, label }
        }).sort((a, b) => a.label.localeCompare(b.label)))
        setRmOptions(data.raw_materials.map((rm) => ({ id: rm.id, label: rm.sku })).sort((a, b) => a.label.localeCompare(b.label)))
        setDataLoaded(true)
      })
  }, [])

  // Render graph once data is loaded
  useEffect(() => {
    if (dataLoaded) renderGraph('full-chain')
  }, [dataLoaded, renderGraph])

  // ─── Resize handler ───
  useEffect(() => {
    const onResize = () => {
      if (simulationRef.current && containerRef.current) {
        const w = containerRef.current.clientWidth
        const h = containerRef.current.clientHeight
        simulationRef.current.force('center', d3.forceCenter(w / 2, h / 2))
        simulationRef.current.alpha(0.1).restart()
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ─── Search handler (respects filter visibility) ───
  const handleSearch = useCallback((e) => {
    const q = e.target.value.toLowerCase().trim()
    setSearchQuery(e.target.value)
    const gs = graphStateRef.current
    if (!gs.nodeElements || !gs.linkElements) return
    if (!q) { clearSelection(); return }

    const filterVis = getFilterVisibility()
    const isNodeVisible = (id) => !filterVis || filterVis.visibleNodes.has(id)
    const matchesSearch = (d) => d.label.toLowerCase().includes(q) || (d.sku && d.sku.toLowerCase().includes(q))

    gs.selectedNode = null
    gs.nodeElements.classed('selected', false).classed('neighbor', false)
    gs.nodeElements.classed('search-match', (d) => matchesSearch(d) && isNodeVisible(d.id))
    gs.nodeElements.classed('dimmed', (d) => !isNodeVisible(d.id) || !matchesSearch(d))
    gs.linkElements.classed('highlighted', false).classed('dimmed', true).attr('stroke-opacity', 0.02)
  }, [clearSelection, getFilterVisibility])

  // ─── Filter handlers ───
  const handleCompanyFilter = useCallback((next) => {
    graphStateRef.current.activeFilters.companies = next
    setSelectedCompanies(new Set(next))
    applyFilters()
  }, [applyFilters])

  const handleSupplierFilter = useCallback((next) => {
    graphStateRef.current.activeFilters.suppliers = next
    setSelectedSuppliers(new Set(next))
    applyFilters()
  }, [applyFilters])

  const handleFGFilter = useCallback((next) => {
    graphStateRef.current.activeFilters.finishedGoods = next
    setSelectedFGs(new Set(next))
    applyFilters()
  }, [applyFilters])

  const handleRMFilter = useCallback((next) => {
    graphStateRef.current.activeFilters.rawMaterials = next
    setSelectedRMs(new Set(next))
    applyFilters()
  }, [applyFilters])

  const toggleCertFilter = useCallback((cert) => {
    const gs = graphStateRef.current
    const next = new Set(gs.activeFilters.certifications)
    if (next.has(cert)) next.delete(cert); else next.add(cert)
    gs.activeFilters.certifications = next
    setActiveCertFilters(new Set(next))
    applyFilters()
  }, [applyFilters])

  // ─── Zoom controls ───
  const handleZoomIn = useCallback(() => {
    const gs = graphStateRef.current
    if (gs.zoomBehavior) d3.select(svgRef.current).transition().duration(300).call(gs.zoomBehavior.scaleBy, 1.5)
  }, [])
  const handleZoomOut = useCallback(() => {
    const gs = graphStateRef.current
    if (gs.zoomBehavior) d3.select(svgRef.current).transition().duration(300).call(gs.zoomBehavior.scaleBy, 0.67)
  }, [])
  const handleZoomReset = useCallback(() => {
    const gs = graphStateRef.current
    if (gs.zoomBehavior) d3.select(svgRef.current).transition().duration(500).call(gs.zoomBehavior.transform, d3.zoomIdentity)
  }, [])

  const tabs = [
    { view: 'full-chain', label: 'Full Chain' },
    { view: 'materials', label: 'Materials' },
    { view: 'risk', label: 'Risk' },
    { view: 'products', label: 'Products' },
  ]

  return (
    <div className="kg-app">
      {/* Sidebar */}
      <div className="kg-sidebar">
        <div className="kg-sidebar-header">
          <h1>Supply Chain Knowledge Graph</h1>
          <div className="kg-subtitle">{subtitle}</div>
        </div>

        {/* View Tabs */}
        <div className="kg-view-tabs">
          {tabs.map((t) => (
            <div key={t.view} className={`kg-tab${currentView === t.view ? ' active' : ''}`} onClick={() => switchView(t.view)}>
              {t.label}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="kg-filters">
          <h3>Filters</h3>
          <MultiSelectFilter label="Companies" options={companyOptions} selected={selectedCompanies} onChange={handleCompanyFilter} />
          <MultiSelectFilter label="Finished Goods" options={fgOptions} selected={selectedFGs} onChange={handleFGFilter} />
          <MultiSelectFilter label="Raw Materials" options={rmOptions} selected={selectedRMs} onChange={handleRMFilter} />
          <MultiSelectFilter label="Suppliers" options={supplierOptions} selected={selectedSuppliers} onChange={handleSupplierFilter} />
          <div className="kg-filter-btn-group" style={{ marginTop: 8 }}>
            <span className="kg-filter-label">Cert:</span>
            {certifications.map((cert) => (
              <span key={cert} className={`kg-filter-btn${activeCertFilters.has(cert) ? ' active' : ''}`} onClick={() => toggleCertFilter(cert)}>
                {cert.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="kg-section">
          <h3>Search</h3>
          <input type="text" className="kg-search" placeholder="Search companies, products, suppliers, materials..." value={searchQuery} onChange={handleSearch} />
        </div>

        {/* Legend */}
        <div className="kg-section">
          <h3>Legend</h3>
          <div className="kg-legend">
            {legendItems.map((item) => (
              <div key={item.type} className="kg-legend-item">
                <span className="kg-dot" style={{ background: item.color }} />
                <span>{item.displayName}{item.extra}</span>
                <span className="kg-count">{item.count}</span>
              </div>
            ))}
            {edgeItems.map((item) => (
              <div key={item.type} className="kg-legend-item">
                <span className="kg-dot" style={{ background: item.color, borderRadius: 2, width: 14, height: 3 }} />
                <span style={{ fontSize: 11 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="kg-insights">
          <h3>Key Insights</h3>
          {insights.map((ins, i) => (
            <div key={i} className="kg-insight-card">
              <div className="kg-insight-title">{ins.title}</div>
              <div className="kg-insight-value">{ins.value}</div>
              <div className="kg-insight-sub">{ins.sub}</div>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className="kg-details" ref={detailsRef}>
          <h3>Details</h3>
          <p className="empty">Click a node to explore supply chain</p>
        </div>
      </div>

      {/* Graph Area */}
      <div className="kg-graph-container" ref={containerRef}>
        <svg ref={svgRef} />
        <div className="kg-view-label">{VIEW_LABELS[currentView]}</div>
        <div className="kg-controls">
          <button onClick={handleZoomIn} title="Zoom In">+</button>
          <button onClick={handleZoomOut} title="Zoom Out">−</button>
          <button onClick={handleZoomReset} title="Reset View">⟲</button>
        </div>
        <div className="kg-tooltip" ref={tooltipRef} />
        <div className="kg-stats">{stats}</div>
      </div>
    </div>
  )
}
