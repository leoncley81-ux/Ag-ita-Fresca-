import React, { useState, useEffect } from 'react';
import { Plus, Download, Truck } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function App() {
  const [currentPage, setCurrentPage] = useState('sales');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeInput, setExchangeInput] = useState('');
  const [sales, setSales] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const products = [
    { id: 'recarga_19', name: 'Recarga 19L', emoji: '🚰', priceUSD: 0.75 },
    { id: 'recarga_5', name: 'Recarga 5L', emoji: '💧', priceUSD: 0.35 },
    { id: 'recarga_3', name: 'Recarga 3L', emoji: '💦', priceUSD: 0.25 },
    { id: 'hielo', name: 'Hielo 5kg', emoji: '🧊', priceUSD: 1.5 },
    { id: 'botellon_19', name: 'Botellón 19L', emoji: '🛢️', priceUSD: 7.0 },
    { id: 'botellon_5', name: 'Botellón 5L', emoji: '🫙', priceUSD: 2.5 },
    { id: 'botellon_3', name: 'Botellón 3L', emoji: '🪧', priceUSD: 1.8 },
    { id: 'botellitas_550', name: 'Botellitas 550ml', emoji: '🍾', priceUSD: 16.0 },
    { id: 'botellitas_330', name: 'Botellitas 330ml', emoji: '🥤', priceUSD: 13.0 },
  ];

  const paymentMethodsCommon = ['Punto de Venta', 'Efectivo BS', 'Efectivo USD', 'Pago Móvil', 'Crédito'];
  const paymentMethodsOther = ['Zelle', 'Binance', 'Transferencia'];

  useEffect(() => {
    const saved = localStorage.getItem('aguita_fresca_data');
    if (saved) {
      const data = JSON.parse(saved);
      setSales(data.sales || []);
      setExchangeRate(data.exchangeRate);
    }
  }, []);

  const saveData = (newSales, rate) => {
    localStorage.setItem('aguita_fresca_data', JSON.stringify({
      sales: newSales,
      exchangeRate: rate
    }));
  };

  const handleAddSale = (product, quantity, paymentMethod, type = 'local', promoApplied = false) => {
    if (!exchangeRate) {
      alert('Por favor ingresa la tasa de cambio primero');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const priceInBS = product.priceUSD * exchangeRate;
    const newSale = {
      id: Date.now(),
      date: today,
      productId: product.id,
      productName: product.name,
      quantity: parseInt(quantity),
      priceUSD: product.priceUSD,
      priceBS: priceInBS,
      totalBS: promoApplied ? (1.0 * exchangeRate) : (priceInBS * parseInt(quantity)),
      paymentMethod: paymentMethod,
      type: type,
      promoApplied: promoApplied,
      timestamp: new Date().toISOString()
    };

    const updatedSales = [...sales, newSale];
    setSales(updatedSales);
    saveData(updatedSales, exchangeRate);
  };

  const handleUpdateRate = () => {
    const rate = parseFloat(exchangeInput);
    if (rate > 0) {
      setExchangeRate(rate);
      saveData(sales, rate);
      setExchangeInput('');
      alert('Tasa actualizada: ' + rate + ' BS/USD');
    }
  };

  const getTodaySales = (type) => {
    const today = new Date().toISOString().slice(0, 10);
    return sales.filter(s => s.date === today && s.type === type);
  };

  const getMonthSales = (type) => {
    return sales.filter(s => s.date.startsWith(selectedMonth) && s.type === type);
  };

  const calculateTotals = (salesList) => {
    const totals = {
      totalBS: 0,
      totalUSD: 0,
      byPayment: {},
      byProduct: {}
    };

    salesList.forEach(sale => {
      totals.totalBS += sale.totalBS;
      totals.totalUSD += sale.promoApplied ? 1.0 : (sale.quantity * sale.priceUSD);

      if (!totals.byPayment[sale.paymentMethod]) {
        totals.byPayment[sale.paymentMethod] = { BS: 0, count: 0 };
      }
      totals.byPayment[sale.paymentMethod].BS += sale.totalBS;
      totals.byPayment[sale.paymentMethod].count += sale.quantity;

      if (!totals.byProduct[sale.productName]) {
        totals.byProduct[sale.productName] = { quantity: 0, totalBS: 0 };
      }
      totals.byProduct[sale.productName].quantity += sale.quantity;
      totals.byProduct[sale.productName].totalBS += sale.totalBS;
    });

    return totals;
  };

  const exportToExcel = (data, filename) => {
    const excelData = [
      ['AGÜITA FRESCA - REPORTE DE VENTAS', '', '', '', '', '', ''],
      ['Fecha de generación:', new Date().toLocaleString('es-VE'), '', '', '', '', ''],
      ['Tasa de cambio:', exchangeRate + ' BS/USD', '', '', '', '', ''],
      [],
      ['Fecha', 'Tipo', 'Producto', 'Cantidad', 'Precio USD', 'Precio BS (unitario)', 'Total BS', 'Método de Pago', 'Promoción'],
      ...data.map(s => [
        s.date,
        s.type === 'local' ? 'Local' : 'Delivery',
        s.productName,
        s.quantity,
        s.priceUSD.toFixed(2),
        s.priceBS.toFixed(2),
        s.totalBS.toFixed(2),
        s.paymentMethod,
        s.promoApplied ? '2x1' : ''
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(excelData);

    ws['!cols'] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 }
    ];

    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2563EB' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    for (let i = 0; i < 9; i++) {
      const cellRef = XLSX.utils.encode_col(i) + '5';
      if (!ws[cellRef]) ws[cellRef] = {};
      ws[cellRef].s = headerStyle;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

    XLSX.writeFile(wb, filename);
  };

  const todaySalesLocal = getTodaySales('local');
  const todaySalesDelivery = getTodaySales('delivery');
  const monthSalesLocal = getMonthSales('local');
  const monthSalesDelivery = getMonthSales('delivery');

  const todayTotalsLocal = calculateTotals(todaySalesLocal);
  const todayTotalsDelivery = calculateTotals(todaySalesDelivery);
  const monthTotalsLocal = calculateTotals(monthSalesLocal);
  const monthTotalsDelivery = calculateTotals(monthSalesDelivery);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)', padding: '16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' }}>Agüita Fresca</h1>
              <p style={{ color: '#6b7280', margin: 0 }}>Sistema de Ventas y Reportes</p>
            </div>
            {exchangeRate && (
              <div style={{ textAlign: 'right', background: '#eff6ff', padding: '16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <p style={{ color: '#6b7280', margin: '0 0 8px 0', fontSize: '14px' }}>Tasa Actual</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>{exchangeRate} BS/USD</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {['sales', 'delivery', 'daily', 'monthly', 'settings'].map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                background: currentPage === page ? '#2563eb' : 'white',
                color: currentPage === page ? 'white' : '#374151',
                transition: 'all 0.3s',
                boxShadow: currentPage === page ? '0 2px 8px rgba(37, 99, 235, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {page === 'sales' && '🏪 Local'}
              {page === 'delivery' && <><Truck size={16} /> Delivery</>}
              {page === 'daily' && '📊 Diario'}
              {page === 'monthly' && '📈 Mensual'}
              {page === 'settings' && '⚙️ Config'}
            </button>
          ))}
        </div>

        {currentPage === 'sales' && (
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginTop: 0, marginBottom: '24px' }}>🏪 Nueva Venta - Local</h2>
            <SalesForm
              products={products}
              paymentMethodsCommon={paymentMethodsCommon}
              paymentMethodsOther={paymentMethodsOther}
              onAddSale={handleAddSale}
              exchangeRate={exchangeRate}
              type="local"
            />
          </div>
        )}

        {currentPage === 'delivery' && (
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginTop: 0, marginBottom: '24px' }}>🚚 Nueva Venta - Delivery</h2>
            <SalesForm
              products={products}
              paymentMethodsCommon={paymentMethodsCommon}
              paymentMethodsOther={paymentMethodsOther}
              onAddSale={handleAddSale}
              exchangeRate={exchangeRate}
              type="delivery"
            />
          </div>
        )}

        {currentPage === 'daily' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px 0' }}>🏪 Local</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Total BS</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>{todayTotalsLocal.totalBS.toFixed(2)}</p>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Total USD</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>{todayTotalsLocal.totalUSD.toFixed(2)}</p>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Transacciones</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#4f46e5', margin: 0 }}>{todaySalesLocal.length}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div style={{ background: '#fafafa', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px' }}>Por Método de Pago</h3>
                  <div>
                    {Object.entries(todayTotalsLocal.byPayment).length === 0 ? (
                      <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Sin ventas</p>
                    ) : (
                      Object.entries(todayTotalsLocal.byPayment).map(([method, data]) => (
                        <div key={method} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', padding: '12px 0' }}>
                          <span style={{ color: '#374151' }}>{method}</span>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>{data.BS.toFixed(2)} BS</p>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{data.count} unid</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px' }}>Top Productos</h3>
                  <div>
                    {Object.entries(todayTotalsLocal.byProduct).length === 0 ? (
                      <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Sin ventas</p>
                    ) : (
                      Object.entries(todayTotalsLocal.byProduct)
                        .sort((a, b) => b[1].quantity - a[1].quantity)
                        .slice(0, 5)
                        .map(([product, data]) => (
                          <div key={product} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', padding: '12px 0' }}>
                            <span style={{ color: '#374151' }}>{product}</span>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>{data.quantity} unid</p>
                              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{data.totalBS.toFixed(2)} BS</p>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
              {todaySalesLocal.length > 0 && (
                <button
                  onClick={() => exportToExcel(todaySalesLocal, `ventas_local_${new Date().toISOString().slice(0, 10)}.xlsx`)}
                  style={{
                    width: '100%',
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background 0.3s',
                    marginTop: '16px'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#15803d'}
                  onMouseOut={(e) => e.target.style.background = '#16a34a'}
                >
                  <Download size={20} /> Descargar Excel
                </button>
              )}
            </div>

            <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px 0' }}>🚚 Delivery</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Total BS</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>{todayTotalsDelivery.totalBS.toFixed(2)}</p>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Total USD</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>{todayTotalsDelivery.totalUSD.toFixed(2)}</p>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Transacciones</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#4f46e5', margin: 0 }}>{todaySalesDelivery.length}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div style={{ background: '#fafafa', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px' }}>Por Método de Pago</h3>
                  <div>
                    {Object.entries(todayTotalsDelivery.byPayment).length === 0 ? (
                      <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Sin ventas</p>
                    ) : (
                      Object.entries(todayTotalsDelivery.byPayment).map(([method, data]) => (
                        <div key={method} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', padding: '12px 0' }}>
                          <span style={{ color: '#374151' }}>{method}</span>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>{data.BS.toFixed(2)} BS</p>
                            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{data.count} unid</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px' }}>Top Productos</h3>
                  <div>
                    {Object.entries(todayTotalsDelivery.byProduct).length === 0 ? (
                      <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>Sin ventas</p>
                    ) : (
                      Object.entries(todayTotalsDelivery.byProduct)
                        .sort((a, b) => b[1].quantity - a[1].quantity)
                        .slice(0, 5)
                        .map(([product, data]) => (
                          <div key={product} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', padding: '12px 0' }}>
                            <span style={{ color: '#374151' }}>{product}</span>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>{data.quantity} unid</p>
                              <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{data.totalBS.toFixed(2)} BS</p>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
              {todaySalesDelivery.length > 0 && (
                <button
                  onClick={() => exportToExcel(todaySalesDelivery, `ventas_delivery_${new Date().toISOString().slice(0, 10)}.xlsx`)}
                  style={{
                    width: '100%',
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background 0.3s',
                    marginTop: '16px'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#15803d'}
                  onMouseOut={(e) => e.target.style.background = '#16a34a'}
                >
                  <Download size={20} /> Descargar Excel
                </button>
              )}
            </div>
          </div>
        )}

        {currentPage === 'monthly' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '24px' }}>
              <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '8px' }}>Selecciona el mes</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ width: '100%', maxWidth: '300px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px 0' }}>🏪 Local</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Total BS</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>{monthTotalsLocal.totalBS.toFixed(2)}</p>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Total USD</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>{monthTotalsLocal.totalUSD.toFixed(2)}</p>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Días activos</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#4f46e5', margin: 0 }}>{new Set(monthSalesLocal.map(s => s.date)).size}</p>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px 0' }}>🚚 Delivery</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Total BS</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>{monthTotalsDelivery.totalBS.toFixed(2)}</p>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Total USD</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>{monthTotalsDelivery.totalUSD.toFixed(2)}</p>
                </div>
                <div style={{ background: '#fafafa', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Días activos</p>
                  <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#4f46e5', margin: 0 }}>{new Set(monthSalesDelivery.map(s => s.date)).size}</p>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '24px', overflowX: 'auto' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px' }}>Resumen Total por Producto</h3>
              <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #d1d5db' }}>
                    <th style={{ textAlign: 'left', padding: '12px 0' }}>Producto</th>
                    <th style={{ textAlign: 'center', padding: '12px 0' }}>Local (unid)</th>
                    <th style={{ textAlign: 'center', padding: '12px 0' }}>Delivery (unid)</th>
                    <th style={{ textAlign: 'right', padding: '12px 0' }}>Total BS</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(monthTotalsLocal.byProduct).length === 0 && Object.keys(monthTotalsDelivery.byProduct).length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>Sin datos</td>
                    </tr>
                  ) : (
                    Object.keys({ ...monthTotalsLocal.byProduct, ...monthTotalsDelivery.byProduct })
                      .sort()
                      .map((product, idx) => (
                        <tr key={product} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? 'transparent' : '#f9fafb' }}>
                          <td style={{ padding: '12px 0' }}>{product}</td>
                          <td style={{ textAlign: 'center', padding: '12px 0' }}>{monthTotalsLocal.byProduct[product]?.quantity || 0}</td>
                          <td style={{ textAlign: 'center', padding: '12px 0' }}>{monthTotalsDelivery.byProduct[product]?.quantity || 0}</td>
                          <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: 'bold' }}>
                            {((monthTotalsLocal.byProduct[product]?.totalBS || 0) + (monthTotalsDelivery.byProduct[product]?.totalBS || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {(monthSalesLocal.length > 0 || monthSalesDelivery.length > 0) && (
              <button
                onClick={() => exportToExcel([...monthSalesLocal, ...monthSalesDelivery], `ventas_completo_${selectedMonth}.xlsx`)}
                style={{
                  width: '100%',
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.3s'
                }}
                onMouseOver={(e) => e.target.style.background = '#15803d'}
                onMouseOut={(e) => e.target.style.background = '#16a34a'}
              >
                <Download size={20} /> Descargar Excel - Mes Completo
              </button>
            )}
          </div>
        )}

        {currentPage === 'settings' && (
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '24px', display: 'grid', gap: '24px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px' }}>Tasa de Cambio</h2>
              <p style={{ color: '#6b7280', marginBottom: '12px' }}>Ingresa la tasa del día (BS por USD)</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  value={exchangeInput}
                  onChange={(e) => setExchangeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUpdateRate()}
                  placeholder="Ej: 550"
                  style={{ flex: 1, minWidth: '150px', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                  step="0.01"
                />
                <button
                  onClick={handleUpdateRate}
                  style={{
                    padding: '12px 24px',
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#15803d'}
                  onMouseOut={(e) => e.target.style.background = '#16a34a'}
                >
                  Actualizar
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '12px' }}>Información del Sistema</h3>
              <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px', display: 'grid', gap: '8px', fontSize: '14px' }}>
                <p style={{ margin: 0 }}><span style={{ fontWeight: 'bold' }}>Total de ventas registradas:</span> {sales.length}</p>
                <p style={{ margin: 0 }}><span style={{ fontWeight: 'bold' }}>Local:</span> {getTodaySales('local').length} ventas hoy</p>
                <p style={{ margin: 0 }}><span style={{ fontWeight: 'bold' }}>Delivery:</span> {getTodaySales('delivery').length} ventas hoy</p>
                <p style={{ margin: 0 }}><span style={{ fontWeight: 'bold' }}>Tasa actual:</span> {exchangeRate ? exchangeRate + ' BS/USD' : 'No configurada'}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>Última actualización: {new Date().toLocaleString('es-VE')}</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px', background: '#fef3c7', padding: '16px', borderRadius: '8px' }}>
              <h3 style={{ fontWeight: 'bold', color: '#92400e', marginTop: 0, marginBottom: '8px' }}>⚠️ Importante</h3>
              <p style={{ fontSize: '14px', color: '#92400e', margin: '0 0 8px 0' }}>Los datos se guardan en tu navegador. Asegúrate de hacer backups regularmente descargando los Excel desde los reportes.</p>
              <p style={{ fontSize: '12px', color: '#b45309', margin: 0 }}>Versión: 2.1.0 | Exportación a Excel ✨</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SalesForm({ products, paymentMethodsCommon, paymentMethodsOther, onAddSale, exchangeRate, type }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('Punto de Venta');
  const [otherPayment, setOtherPayment] = useState('');
  const [useOtherPayment, setUseOtherPayment] = useState(false);
  const [promoActive, setPromoActive] = useState(false);

  const quantityButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handleSubmit = () => {
    if (!selectedProduct || !quantity) {
      alert('Completa todos los campos');
      return;
    }

    const finalPayment = useOtherPayment ? otherPayment : paymentMethod;
    onAddSale(selectedProduct, quantity, finalPayment, type, promoActive);

    setQuantity('1');
    setSelectedProduct(null);
    setPromoActive(false);
    alert('✅ Venta registrada!');
  };

  const isRecharge = (product) => product.id.startsWith('recarga_');
  const priceInBS = selectedProduct ? (selectedProduct.priceUSD * (exchangeRate || 1)).toFixed(2) : 0;

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div>
        <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '12px' }}>Selecciona un producto</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              style={{
                padding: '16px 12px',
                border: selectedProduct?.id === product.id ? '3px solid #2563eb' : '2px solid #e5e7eb',
                borderRadius: '8px',
                background: selectedProduct?.id === product.id ? '#eff6ff' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                boxShadow: selectedProduct?.id === product.id ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
              }}
              onMouseOver={(e) => !selectedProduct || selectedProduct.id !== product.id ? e.currentTarget.style.borderColor = '#2563eb' : null}
              onMouseOut={(e) => !selectedProduct || selectedProduct.id !== product.id ? e.currentTarget.style.borderColor = '#e5e7eb' : null}
            >
              <span style={{ fontSize: '32px' }}>{product.emoji}</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1f2937', textAlign: 'center' }}>{product.name}</span>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>${product.priceUSD}</span>
            </button>
          ))}
        </div>
        {selectedProduct && (
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '12px 0 0 0' }}>
            ✅ Seleccionado: {selectedProduct.name} - Precio en BS: {priceInBS} BS
          </p>
        )}
      </div>

      <div>
        <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '12px' }}>Cantidad</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(50px, 1fr))', gap: '8px', marginBottom: '12px' }}>
          {quantityButtons.map((btn) => (
            <button
              key={btn}
              onClick={() => setQuantity(btn.toString())}
              style={{
                padding: '10px',
                border: quantity === btn.toString() ? '2px solid #2563eb' : '1px solid #d1d5db',
                borderRadius: '6px',
                background: quantity === btn.toString() ? '#eff6ff' : 'white',
                color: quantity === btn.toString() ? '#2563eb' : '#374151',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {btn}
            </button>
          ))}
        </div>
        <div>
          <label style={{ display: 'block', color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>O cantidad personalizada:</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
      </div>

      {selectedProduct && isRecharge(selectedProduct) && (
        <div style={{ background: '#fef3c7', border: '2px solid #fbbf24', borderRadius: '8px', padding: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
            <input
              type="checkbox"
              checked={promoActive}
              onChange={(e) => setPromoActive(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold', color: '#92400e' }}>🎉 Promoción: 2 Recargas por $1</span>
          </label>
          {promoActive && (
            <p style={{ fontSize: '12px', color: '#92400e', margin: '8px 0 0 0' }}>
              (El cliente selecciona 2 recargas y paga solo $1.00)
            </p>
          )}
        </div>
      )}

      <div>
        <label style={{ display: 'block', color: '#374151', fontWeight: 'bold', marginBottom: '12px' }}>Método de Pago</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '12px' }}>
          {paymentMethodsCommon.map((method) => (
            <button
              key={method}
              onClick={() => {
                setPaymentMethod(method);
                setUseOtherPayment(false);
              }}
              style={{
                padding: '12px',
                border: !useOtherPayment && paymentMethod === method ? '2px solid #2563eb' : '1px solid #d1d5db',
                borderRadius: '6px',
                background: !useOtherPayment && paymentMethod === method ? '#eff6ff' : 'white',
                color: !useOtherPayment && paymentMethod === method ? '#2563eb' : '#374151',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '13px'
              }}
            >
              {method}
            </button>
          ))}
        </div>
        <select
          onChange={(e) => {
            if (e.target.value) {
              setOtherPayment(e.target.value);
              setUseOtherPayment(true);
            }
          }}
          style={{
            width: '100%',
            padding: '10px',
            border: useOtherPayment ? '2px solid #2563eb' : '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            background: useOtherPayment ? '#eff6ff' : 'white',
            color: '#374151'
          }}
        >
          <option value="">Otros métodos de pago</option>
          {paymentMethodsOther.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSubmit}
        style={{
          width: '100%',
          padding: '14px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '16px',
          transition: 'background 0.3s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
        onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
        onMouseOut={(e) => e.target.style.background = '#2563eb'}
      >
        <Plus size={20} /> Registrar Venta {promoActive && '🎉'}
      </button>
    </div>
  );
}
