// ui.js - Manejo de la interfaz de usuario

class UIManager {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        this.suggestions = document.getElementById('suggestions');
        this.selectedSymbol = document.getElementById('selected-symbol');
        this.currentPrice = document.getElementById('current-price');
        this.change24h = document.getElementById('change-24h');
        this.trend = document.getElementById('trend');
        this.targetZone = document.getElementById('target-zone');
        this.bias = document.getElementById('bias');
        this.nearLevels = document.getElementById('near-levels');
        this.lastUpdate = document.getElementById('last-update');
        this.liquidityOverlay = document.getElementById('liquidity-overlay');
        this.priceLabel = document.getElementById('price-label');
        this.messageBar = document.getElementById('message-bar');

        this.init();
    }

    init() {
        this.searchInput.addEventListener('input', this.handleSearch.bind(this));
        this.searchInput.addEventListener('keydown', this.handleKeydown.bind(this));
        document.addEventListener('click', this.handleClickOutside.bind(this));
    }

    handleSearch(e) {
        const query = e.target.value.trim();
        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }

        const matches = api.searchSymbols(query);
        this.showSuggestions(matches);
    }

    handleKeydown(e) {
        if (e.key === 'Enter') {
            const firstSuggestion = this.suggestions.querySelector('.suggestion-item');
            if (firstSuggestion) {
                this.selectSymbol(firstSuggestion.textContent);
            }
        }
    }

    handleClickOutside(e) {
        if (!this.searchInput.contains(e.target) && !this.suggestions.contains(e.target)) {
            this.hideSuggestions();
        }
    }

    showSuggestions(symbols) {
        this.suggestions.innerHTML = '';
        symbols.forEach(symbol => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = symbol;
            item.addEventListener('click', () => this.selectSymbol(symbol));
            this.suggestions.appendChild(item);
        });
        this.suggestions.style.display = 'block';
    }

    hideSuggestions() {
        this.suggestions.style.display = 'none';
    }

    selectSymbol(symbol) {
        console.log('Seleccionando símbolo:', symbol);
        this.searchInput.value = symbol;
        api.currentSymbol = symbol;
        app.currentSymbol = symbol;
        this.hideSuggestions();
        this.updateSelectedSymbol(symbol);
        // Trigger data load
        app.loadData();
    }

    updateSelectedSymbol(symbol) {
        this.selectedSymbol.textContent = symbol;
    }

    updatePrice(price) {
        this.currentPrice.textContent = price ? `$${price.toFixed(4)}` : '-';
        this.priceLabel.textContent = price ? `$${price.toFixed(4)}` : '';
    }

    showMessage(message, type = 'info') {
        if (!this.messageBar) return;
        this.messageBar.textContent = message;
        this.messageBar.className = 'message-bar show';
        if (type === 'error') {
            this.messageBar.style.borderColor = 'rgba(255, 87, 34, 0.6)';
            this.messageBar.style.background = 'rgba(30, 10, 12, 0.7)';
        } else {
            this.messageBar.style.borderColor = 'rgba(0, 212, 255, 0.3)';
            this.messageBar.style.background = 'rgba(0, 0, 0, 0.55)';
        }
        setTimeout(() => {
            this.messageBar.classList.remove('show');
        }, 6000);
    }

    updateChange24h(change) {
        if (change) {
            const percent = change.priceChangePercent;
            const color = percent >= 0 ? '#00C853' : '#FF1744';
            this.change24h.innerHTML = `<span style="color: ${color}">${percent.toFixed(2)}%</span>`;
        } else {
            this.change24h.textContent = '-';
        }
    }

    updateTrend(trend) {
        const trendText = {
            'bullish': 'Alcista',
            'bearish': 'Bajista',
            'neutral': 'Neutral'
        }[trend] || 'Neutral';
        this.trend.textContent = trendText;
    }

    updateTargetZone(zone) {
        if (zone) {
            const typeText = zone.type === 'buy' ? 'Compra' : 'Venta';
            this.targetZone.textContent = `$${zone.price.toFixed(4)} (${typeText}) - Alta liquidez`;
        } else {
            this.targetZone.textContent = '-';
        }
    }

    updateBias(bias) {
        this.bias.textContent = bias;
    }

    updateNearLevels(levels) {
        const currentPrice = parseFloat(this.currentPrice.textContent.replace('$', ''));
        if (levels.length > 0 && !isNaN(currentPrice)) {
            const above = levels.filter(l => l.price > currentPrice).slice(0, 2);
            const below = levels.filter(l => l.price < currentPrice).slice(-2).reverse();
            const text = `Arriba: ${above.map(l => `${l.price.toFixed(4)} (${l.type})`).join(', ')} | Abajo: ${below.map(l => `${l.price.toFixed(4)} (${l.type})`).join(', ')}`;
            this.nearLevels.textContent = text;
        } else {
            this.nearLevels.textContent = '-';
        }
    }

    updateLastUpdate() {
        this.lastUpdate.textContent = new Date().toLocaleTimeString();
    }

    drawLiquidityHeatmap(zones, currentPrice) {
        console.log('Dibujando heatmap para', zones.length, 'zonas con precio actual', currentPrice);
        this.liquidityOverlay.innerHTML = '';
        zones.forEach((zone, index) => {
            const intensity = Math.min(zone.score / 100, 1);
            const color = zone.type === 'buy' ? `rgba(0, 212, 255, ${intensity * 0.6})` : `rgba(255, 87, 34, ${intensity * 0.6})`;
            const div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.left = '0';
            div.style.right = '0';
            div.style.height = '50px';
            div.style.background = color.replace('0.3', '0.6');
            const scale = 0.1; // 10% arriba y abajo del precio actual
            const minPrice = currentPrice * (1 - scale);
            const maxPrice = currentPrice * (1 + scale);
            const range = maxPrice - minPrice;
            const position = Math.max(0, Math.min(1, (zone.price - minPrice) / range));
            div.style.top = `${(1 - position) * 100}%`;
            div.style.zIndex = '1';
            div.style.border = zone === liquidityAnalyzer.getTargetZone() ? '2px solid #FFD700' : 'none';
            this.liquidityOverlay.appendChild(div);
        });
    }

    showLoading() {
        document.querySelectorAll('.panel-card p').forEach(p => p.classList.add('loading'));
    }

    hideLoading() {
        document.querySelectorAll('.panel-card p').forEach(p => p.classList.remove('loading'));
    }
}

// Instancia global
const uiManager = new UIManager();