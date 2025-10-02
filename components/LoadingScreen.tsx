import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';
import KithaiLogo from './AionLogo';

interface Stock {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  direction: 'up' | 'down' | 'neutral';
}

const initialStocks: Stock[] = [
  { symbol: 'KITH', price: 178.39, change: 1.25, changePercent: 0.70, direction: 'up' },
  { symbol: 'EMILIO', price: 189.27, change: -0.98, changePercent: -0.52, direction: 'down' },
  { symbol: 'GOOGL', price: 1515.65, change: 12.33, changePercent: 0.82, direction: 'up' },
  { symbol: 'MSFT', price: 410.54, change: -2.10, changePercent: -0.51, direction: 'down' },
  { symbol: 'BOTS', price: 99.87, change: 0.15, changePercent: 0.15, direction: 'up' },
  { symbol: 'BRH.DEV', price: 2045.11, change: -10.50, changePercent: -0.51, direction: 'down' },
  { symbol: 'NVDA', price: 877.35, change: 8.12, changePercent: 0.93, direction: 'up' },
  { symbol: 'TSLA', price: 175.79, change: -1.44, changePercent: -0.82, direction: 'down' },
];

const StockTicker: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>(initialStocks);

  useEffect(() => {
    const updateStocks = () => {
      setStocks(prevStocks =>
        prevStocks.map(stock => {
          const changeFactor = (Math.random() - 0.49) * 0.01; // Small random change
          const newPrice = stock.price * (1 + changeFactor);
          const change = newPrice - stock.price;
          const changePercent = (change / stock.price) * 100;

          return {
            ...stock,
            price: newPrice,
            change,
            changePercent,
            direction: change > 0 ? 'up' : 'down',
          };
        })
      );
    };

    const intervalId = setInterval(updateStocks, 1500); // Update every 1.5 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="stock-ticker-container">
      <div className="stock-ticker-tape">
        {[...stocks, ...stocks].map((stock, index) => (
          <div key={index} className={`stock-item ${stock.direction}`}>
            <span className="stock-symbol">{stock.symbol}</span>
            <span className="stock-price">{stock.price.toFixed(2)}</span>
            <span className="stock-change">
              {stock.change >= 0 ? '▲' : '▼'}
              {Math.abs(stock.change).toFixed(2)} ({stock.changePercent.toFixed(2)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};


const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <KithaiLogo className="loading-logo" />
        <p className="loading-text">Loading Your Workspace...</p>
        <div className="spinner"></div>
      </div>
      <StockTicker />
    </div>
  );
};

export default LoadingScreen;