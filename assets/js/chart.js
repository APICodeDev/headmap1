// chart.js - Manejo del gráfico de velas

class ChartManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
        this.candlestickSeries = null;
        this.priceLine = null;
        this.liquidityLines = [];
    }

    init() {
        const chartContainer = document.getElementById(this.containerId);
        this.chart = LightweightCharts.createChart(chartContainer, {
            layout: {
                background: { color: 'rgba(15, 15, 35, 0.8)' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
                horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
            },
            timeScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#00C853',
            downColor: '#FF1744',
            borderVisible: false,
            wickUpColor: '#00C853',
            wickDownColor: '#FF1744',
        });

        // Línea de precio actual
        this.priceLine = this.chart.addLineSeries({
            color: '#00d4ff',
            lineWidth: 2,
            priceLineVisible: false,
        });
    }

    updateData(candles) {
        if (this.candlestickSeries) {
            this.candlestickSeries.setData(candles);
        }
    }

    updatePriceLine(price) {
        if (this.priceLine && price) {
            const lastTime = this.candlestickSeries.data()[this.candlestickSeries.data().length - 1]?.time;
            if (lastTime) {
                this.priceLine.setData([{ time: lastTime, value: price }]);
            }
        }
    }

    addLiquidityLevel(price, color, label) {
        const line = this.chart.addLineSeries({
            color: color,
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            priceLineVisible: false,
        });
        const lastTime = this.candlestickSeries.data()[this.candlestickSeries.data().length - 1]?.time;
        if (lastTime) {
            line.setData([
                { time: this.candlestickSeries.data()[0].time, value: price },
                { time: lastTime, value: price }
            ]);
        }
        this.liquidityLines.push(line);
        return line;
    }

    clearLiquidityLines() {
        this.liquidityLines.forEach(line => {
            this.chart.removeSeries(line);
        });
        this.liquidityLines = [];
    }

    resize() {
        try {
            if (this.chart && this.chart.timeScale) {
                this.chart.timeScale().fitContent();
            }
        } catch (error) {
            console.error('Error in resize:', error);
        }
    }
}

// Instancia global
const chartManager = new ChartManager('chart');