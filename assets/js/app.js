// app.js - Aplicación principal

class App {
    constructor() {
        this.currentSymbol = 'XRPUSDT';
        this.interval = null;
    }

    async init() {
        console.log('Inicializando app');
        uiManager.showMessage('Iniciando, cargando datos...', 'info');
        await api.getSymbols();
        api.currentSymbol = this.currentSymbol;
        chartManager.init();
        this.loadData();
        this.startAutoUpdate();
        this.setupEventListeners();
    }

    async loadData() {
        uiManager.showLoading();
        console.log('Cargando datos para', this.currentSymbol);

        try {
            const [candles, price, change24h] = await Promise.all([
                api.getCandles(this.currentSymbol),
                api.getCurrentPrice(this.currentSymbol),
                api.get24hChange(this.currentSymbol)
            ]);

            console.log('Velas obtenidas:', candles.length);
            console.log('Precio:', price);
            console.log('Cambio 24h:', change24h);

            // Actualizar precios en UI aunque no haya velas (para evitar cuadros en blanco)
            uiManager.updatePrice(price);
            uiManager.updateChange24h(change24h);
            uiManager.updateLastUpdate();

            if (candles.length > 0) {
                console.log('Actualizando gráfico con', candles.length, 'velas');
                chartManager.updateData(candles);
                chartManager.updatePriceLine(price);
                chartManager.resize();

                liquidityAnalyzer.calculateZones(candles, price);
                const zones = liquidityAnalyzer.getZones();
                const targetZone = liquidityAnalyzer.getTargetZone();

                console.log('Zonas calculadas:', zones);
                console.log('Zona objetivo:', targetZone);

                // Limpiar líneas anteriores
                chartManager.clearLiquidityLines();

                // Dibujar zonas en el gráfico
                zones.forEach(zone => {
                    // Verde semi-transparente para compras, rojo semi-transparente para ventas
                    const color = zone.type === 'buy' ? '#00C853' : '#FF1744';
                    chartManager.addLiquidityLevel(zone.price, color, zone.type);
                });

                // Dibujar heatmap
                uiManager.drawLiquidityHeatmap(zones, price);

                // Actualizar UI adicional
                uiManager.updateTrend(liquidityAnalyzer.calculateTrend(candles));
                uiManager.updateTargetZone(targetZone);
                uiManager.updateBias(this.calculateBias(candles, price));
                uiManager.updateNearLevels(zones);
            } else {
                console.warn('No se obtuvieron velas para', this.currentSymbol);
                uiManager.showMessage('No se obtuvieron datos de velas para este activo. Puede que la API no responda o el símbolo no exista.', 'error');
                // Dejar gráfico en blanco si no hay velas
                chartManager.updateData([]);
                chartManager.clearLiquidityLines();
                uiManager.updateTrend('neutral');
                uiManager.updateTargetZone(null);
                uiManager.updateBias('Neutral');
                uiManager.updateNearLevels([]);
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            uiManager.showMessage('Error cargando datos. Revisa la consola para más detalles.', 'error');
        }

        uiManager.hideLoading();
    }

    calculateBias(candles, currentPrice) {
        const trend = liquidityAnalyzer.calculateTrend(candles);
        const target = liquidityAnalyzer.getTargetZone();

        if (!target) return 'Neutral';

        if (trend === 'bullish' && target.type === 'sell') {
            return 'Bullish Liquidity Sweep';
        } else if (trend === 'bearish' && target.type === 'buy') {
            return 'Bearish Liquidity Sweep';
        }
        return 'Neutral';
    }

    startAutoUpdate() {
        this.interval = setInterval(() => {
            console.log('Actualizando datos automáticamente...');
            this.loadData();
        }, 10000); // Actualizar cada 10 segundos para debug
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.addEventListener('click', () => {
            this.loadData();
        });
    }
}

// Instancia global
const app = new App();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});