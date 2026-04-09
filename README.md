# 🧠 Argos - AI Supply Chain Intelligence

**AI-powered decision support system for raw material sourcing in the CPG industry**

Built for Q-Hack × Spherecast Hackathon

---

## 🎯 Overview

Argos is an intelligent supply chain manager that helps CPG companies make smarter raw material sourcing decisions by:

1. **Finding substitutable ingredients** across 876 raw materials
2. **Ensuring compliance** with dietary claims and allergen requirements
3. **Scoring quality** and prioritizing by ingredient importance
4. **Identifying consolidation opportunities** to reduce supplier complexity
5. **Analyzing supply chain risks** like single-source dependencies

---

## 🏆 Key Features

### 1. Intelligent Ingredient Resolution
- **876 raw materials** → **357 canonical names** → **137 ingredient families**
- Groups exact matches, form variants, and functional substitutes
- Example: `vitamin-d3`, `cholecalciferol`, `vitamin-d` → `vitamin-d` family

### 2. Functional Role Labeling
- **100% coverage** of 1,528 BOM components
- **18 functional categories**: vitamin_mineral, emulsifier, sweetener, etc.
- Ensures substitutes serve the same purpose in formulations

### 3. 3-Factor Recommendation Engine
- **Compliance Gate**: LLM-powered verification of dietary/allergen requirements
- **Quality Scoring**: Heuristic + LLM assessment of ingredient quality
- **Priority Weighting**: Based on ingredient order in formulation
- **Final Score**: `compliance × (0.4×quality + 0.4×priority + 0.2×family_bonus)`

### 4. Supply Chain Risk Analysis
- **18 single-source ingredients** identified
- **Supplier concentration**: Prinova USA serves 60/61 companies (98% risk)
- **Diversification recommendations** for each company

### 5. Consolidation Optimizer
- **15 consolidation opportunities** found
- Example: Ultima Replenisher can source 10 ingredients from Prinova USA
- Reduces supplier complexity while maintaining quality

### 6. 🆕 Company Intelligence Dashboard
- **Supply Chain Health Scoring**: 0-100 scores with A-D grades
- **Priority Actions Panel**: Strategic recommendations (risk reduction, quality upgrades, consolidation)
- **Health Metrics Breakdown**: Single-source risk, supplier concentration, diversification
- **Batching Opportunities**: Visual consolidation scenarios with savings estimates
- **Interactive Drill-Down**: Click any company to see detailed strategic insights

### 7. 🆕 Ingredient Explorer
- **Top Ingredients Ranking**: Most-used ingredients across entire supply chain
- **Company-Supplier Mapping**: Which companies use each ingredient and from which suppliers
- **Substitution Patterns**: Alternative ingredients with usage analytics
- **Two-Panel Interface**: Ingredient list + detailed analytics view
- **Family Classification**: Form variants, functional substitutes, exact matches

---

## 📊 Results

### Substitution Recommendations
- **7,362 candidates** generated across 149 products
- **Average 49 recommendations per product**
- **Top categories**: Vitamins/minerals (3,351), Flavoring (619), Fillers (480)

### Sample Recommendation
```
Company: NOW Foods
Product: FG-iherb-10421
Current: softgel-capsule-bovine-gelatin
Substitute: gelatin-capsule
Role: capsule_shell
Type: form_variant
Score: 0.666
Suppliers: Capsuline, Darling Ingredients/Rousselot
Reasoning: Form variant substitution; equivalent quality
```

### Risk Insights
- **Xanthan gum**: 8 companies depend on single supplier (Ingredion)
- **Natural flavors**: 8 companies, single supplier (Gold Coast Ingredients)
- **Prinova USA**: Highest concentration risk (60 companies, 408 materials)

---

## 🛠️ Tech Stack

### Backend
- **FastAPI**: REST API with 15+ endpoints
- **SQLite**: Database with 387 nodes, 1,812 relationships
- **NetworkX**: Knowledge graph construction
- **OpenRouter + NVIDIA Nemotron**: LLM-powered compliance checking
- **Python 3.9+**: Core logic and data processing

### Frontend
- **React + Vite**: Modern SPA framework with HMR
- **Premium UI Design**: Glassmorphism, gradient accents, smooth animations
- **Inter Font**: Modern typography with intentional spacing
- **Canvas API**: Network graph visualization
- **Responsive Design**: Mobile-first with dark theme

### Data Intelligence
- **Hybrid approach**: Rule-based heuristics + LLM fallback
- **Enrichment data**: 60 products with dietary claims, allergens, ingredient order
- **Multi-source integration**: Walmart scraped data + iHerb/Open Food Facts

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- OpenRouter API key (free tier works)

### Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv ../venv
source ../venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
echo "OPENROUTER_API_KEY=your_key_here" > ../.env

# Run data processing pipeline
python ingredients.py      # Ingredient resolution
python enrichment.py       # Data enrichment
python roles.py           # Functional role labeling
python graph.py           # Knowledge graph
python recommendations.py  # Generate candidates
python llm_compliance.py  # Compliance scoring
python quality_scoring.py # Quality & final scores

# Start API server
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Access
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📡 API Endpoints

### Graph & Analytics
- `GET /api/graph` - Full knowledge graph (387 nodes, 1,812 edges)
- `GET /api/graph/stats` - Graph statistics
- `GET /api/companies` - All companies with product counts
- `GET /api/companies/{id}` - Company details with ingredients, suppliers, risks
- `GET /api/ingredients` - All ingredient families
- `GET /api/suppliers` - All suppliers with coverage stats

### Recommendations
- `GET /api/recommendations/top?limit=50` - Top-scored recommendations
- `GET /api/recommendations/product/{id}` - Product-specific recommendations
- `GET /api/recommendations/consolidation` - Supplier consolidation opportunities
- `GET /api/recommendations/diversification/{company_id}` - Diversification strategies
- `GET /api/recommendations/concentration` - Supplier concentration analysis

### Risk Analysis
- `GET /api/risks` - Single-source risks, concentration risks, dependency analysis

### 🆕 Supply Chain Intelligence
- `GET /api/analytics/ingredients/top?limit=50` - Most-used ingredients with usage statistics
- `GET /api/analytics/ingredients/{sku}` - Detailed ingredient analysis (companies, suppliers, alternatives)
- `GET /api/analytics/batching?company_id={id}` - Supplier batching and consolidation opportunities
- `GET /api/analytics/company/{id}/health` - Supply chain health score (0-100 with grade A-D)

---

## 📁 Project Structure

```
q-hack/
├── backend/
│   ├── main.py                 # FastAPI app entry
│   ├── db.py                   # Database helper
│   ├── models.py               # Pydantic models
│   ├── ingredients.py          # Identity resolution
│   ├── enrichment.py           # Data cleaning
│   ├── roles.py                # Functional labeling
│   ├── graph.py                # Knowledge graph
│   ├── recommendations.py      # Candidate generation
│   ├── llm_compliance.py       # Compliance gate
│   ├── quality_scoring.py      # Quality scoring
│   ├── consolidation.py        # Consolidation optimizer
│   ├── routes.py               # API endpoints
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main app
│   │   ├── App.css             # Styles
│   │   └── components/
│   │       ├── Dashboard.jsx   # Main dashboard
│   │       ├── CompanyIntelligence.jsx # 🆕 Company health & intelligence
│   │       ├── IngredientExplorer.jsx  # 🆕 Ingredient analytics
│   │       ├── RecommendationsView.jsx
│   │       └── GraphView.jsx   # Graph visualization
│   └── package.json
├── backend/
│   ├── ingredient_analytics.py # 🆕 Ingredient intelligence module
├── db_new.sqlite               # Main database
├── enriched_products.json      # External enrichment data
└── .env                        # API keys
```

---

## 🎨 Frontend Features

### Dashboard
- Real-time statistics (nodes, edges, companies, suppliers)
- Top 10 substitution recommendations
- Supply chain risk alerts
- Company list with quick access to intelligence view

### 🆕 Company Intelligence Dashboard
- **Health Score Widget**: Circular 0-100 score with color-coded grade (A-D)
- **Priority Actions Panel**: Top 3 strategic recommendations
  - 🛡️ Risk Reduction (single-source ingredients)
  - ⭐ Quality Upgrades (organic/non-GMO alternatives)
  - 💰 Supplier Consolidation (batching opportunities)
- **Health Metrics Breakdown**: Visual progress bars for risk, concentration, diversification
- **Batching Opportunities**: Card-based grid showing consolidation scenarios
- **Diversification Table**: Alternative suppliers with scores

### 🆕 Ingredient Explorer
- **Two-Panel Layout**: Ingredient list + detailed analytics
- **Top 20 Ingredients**: Ranked by usage across all products
- **Usage Statistics**: Companies using, suppliers providing, alternatives available
- **Company-Supplier Mapping**: Visual grid showing relationships
- **Substitution Patterns**: Alternative ingredients with family classification
- **Functional Roles**: How ingredients are used in formulations

### Recommendations Explorer
- Filterable by type (form variants vs functional substitutes)
- Detailed scoring breakdown
- Supplier availability
- Consolidation opportunities

### Knowledge Graph
- Network visualization of 387 nodes
- Color-coded by entity type
- Edge statistics (owns, contains, supplies, substitutes)

---

## 🧪 Data Processing Pipeline

1. **Ingredient Identity Resolution** (ingredients.py)
   - Parse 876 raw material SKUs
   - Group into canonical names using fuzzy matching
   - Classify as exact match, form variant, or functional substitute
   - Store in `Ingredient_Family` table

2. **Enrichment Cleaning** (enrichment.py)
   - Merge SQLite + JSON enrichment data
   - Parse dietary claims (GF, vegan, non-GMO, etc.)
   - Extract allergen information
   - Parse ingredient order from labels
   - Store in `Clean_Enrichment` table

3. **Functional Role Labeling** (roles.py)
   - Apply 350+ heuristic rules
   - Classify into 18 functional categories
   - 100% coverage achieved
   - Store in `Ingredient_Role` table

4. **Knowledge Graph Construction** (graph.py)
   - Build NetworkX directed graph
   - Add company, product, ingredient, supplier nodes
   - Create edges: owns, contains, supplies, substitutes
   - Calculate priority weights from ingredient order

5. **Recommendation Generation** (recommendations.py)
   - Find substitutes in same family + same role
   - Check supplier availability
   - Calculate priority rank
   - Store in `Substitution_Candidate` table

6. **Compliance Scoring** (llm_compliance.py)
   - Extract requirements from enrichment
   - LLM-powered verification (NVIDIA Nemotron)
   - Rule-based fallback
   - Update compliance scores

7. **Quality & Final Scoring** (quality_scoring.py)
   - Heuristic quality assessment
   - Priority weighting
   - Final score calculation
   - Top recommendations identified

---

## 🏅 Hackathon Judging Criteria

### ✅ Practical Usefulness
- **Real-world impact**: Reduces supplier complexity, identifies risks
- **Actionable insights**: Specific recommendations with reasoning
- **Scalable**: Handles 876 materials, 149 products, 61 companies

### ✅ Quality of Reasoning
- **Multi-factor scoring**: Compliance, quality, priority
- **Functional role matching**: Ensures substitutes serve same purpose
- **Evidence trails**: Every recommendation includes reasoning

### ✅ Trustworthiness
- **Compliance gate**: Verifies dietary/allergen requirements
- **Confidence scores**: Transparent uncertainty quantification
- **Hybrid approach**: Rule-based + LLM for reliability

### ✅ Operationalizing Missing Information
- **Enrichment integration**: Merges multiple data sources
- **Graceful degradation**: Works with partial data
- **Incremental improvement**: Ready for more enrichment data

---

## 📈 Future Enhancements

- [ ] Interactive graph with zoom/pan/filter
- [ ] Cost optimization (integrate pricing data)
- [ ] Lead time analysis
- [ ] Batch recommendation execution
- [ ] Export to CSV/Excel
- [ ] Email alerts for supply chain risks
- [ ] Mobile-responsive design
- [ ] Multi-language support

---

## 👥 Team

Built by Shivam Suchak for Q-Hack × Spherecast Hackathon

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- Spherecast for the challenge and data
- OpenRouter for LLM API access
- Open Food Facts & iHerb for enrichment data
