import { useEffect, useRef } from "react";

export default function TradingChart({ symbol = "BTCUSDT" }) {
  const container = useRef(null);

  useEffect(() => {
    if (!window.TradingView) return;

    new window.TradingView.widget({
      autosize: true,
      symbol,
      interval: "15",
      timezone: "Asia/Karachi",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      container_id: container.current.id,
    });
  }, [symbol]);

  return (
    <div
      id={`tv_${symbol}`}
      ref={container}
      style={{ height: "450px", width: "100%" }}
    />
  );
}
