import express from 'express';
import { protect as auth } from '../middleware/auth.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import Alert from '../models/Alert.js';
import FinanceRecord from '../models/FinanceRecord.js';
import FuelRecord from '../models/FuelRecord.js';
import Machinery from '../models/Machinery.js';
import Part from '../models/Part.js';
import Rental from '../models/Rental.js';
import Tool from '../models/Tool.js';
import Vehicle from '../models/Vehicle.js';
import Warehouse from '../models/Warehouse.js';
import fs from 'fs';
import PdfPrinter from 'pdfmake';
import path from 'path';
import { fileURLToPath } from 'url';
import { stringify } from 'csv-stringify/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fonts = {
  Roboto: {
    normal: path.join(__dirname, 'fonts/Roboto-Regular.ttf'),
    bold: path.join(__dirname, 'fonts/Roboto-Medium.ttf'),
    italics: path.join(__dirname, 'fonts/Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, 'fonts/Roboto-MediumItalic.ttf')
  }
};

const printer = new PdfPrinter(fonts);
const router = express.Router();

const models = {
  alerts: Alert,
  finance: FinanceRecord,
  fuel: FuelRecord,
  machinery: Machinery,
  parts: Part,
  rentals: Rental,
  tools: Tool,
  vehicles: Vehicle,
  warehouses: Warehouse
};

const buildTable = (items) => {
  if (!items || items.length === 0) return [['Sin datos']];

  const headerTranslations = {
    name: 'Nombre',
    type: 'Tipo',
    description: 'Descripción',
    status: 'Estado',
    model: 'Modelo',
    serialNumber: 'Número de Serie',
    acquisitionDate: 'Fecha de Adquisición',
    maintenanceDate: 'Fecha de Mantenimiento',
    location: 'Ubicación',
    brand: 'Marca',
    quantity: 'Cantidad',
    unit: 'Unidad',
    purchaseDate: 'Fecha de Compra',
    provider: 'Proveedor',
    price: 'Precio',
    amount: 'Monto',
    date: 'Fecha',
    category: 'Categoría',
    plate: 'Placa',
    year: 'Año',
    fuelType: 'Tipo de Combustible',
    capacity: 'Capacidad',
    consumption: 'Consumo',
    startDate: 'Fecha de Inicio',
    endDate: 'Fecha de Fin',
    client: 'Cliente',
    details: 'Detalles',
    // Añadir más traducciones según sea necesario
  };

  const originalHeaders = Object.keys(items[0]).filter(k => !['_id', '__v'].includes(k));
  const translatedHeaders = originalHeaders.map(h => headerTranslations[h] || h);

  const rows = items.map(item =>
    originalHeaders.map(h => String(item[h] ?? ''))
  );

  // Para el PDF, formateamos los encabezados para que tengan un fondo
  const pdfHeaders = translatedHeaders.map(header => ({ text: header, style: 'tableHeader' }));

  return [pdfHeaders, ...rows];
};

router.post('/:type', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'Usuario no encontrado' });

    const reportType = req.params.type;
    const format = req.body.format || 'pdf';
    let fileName = `${reportType}_report_${Date.now()}.${format}`;
    let reportData = {};

    if (reportType === 'general') {
      for (const [key, Model] of Object.entries(models)) {
        reportData[key] = {
          count: await Model.countDocuments(),
          items: await Model.find().lean()
        };
      }
    } else {
      const model = models[reportType];
      if (!model) return res.status(400).json({ msg: 'Tipo de reporte inválido' });
      reportData = await model.find().lean();
    }

    const newReport = await Report.create({
      generatedBy: user.id,
      reportType,
      data: reportData
    });

    if (format === 'pdf') {
      const content = [];

      content.push({ text: `Reporte: ${reportType}`, style: 'header' });
      content.push({ text: `Generado por: ${user.name || user.email}`, margin: [0, 0, 0, 10] });
      content.push({ text: `Fecha: ${new Date().toLocaleString()}`, margin: [0, 0, 0, 20] });

      if (reportType === 'general') {
        for (const [key, moduleData] of Object.entries(reportData)) {
          content.push({ text: `${key.toUpperCase()} (${moduleData.count})`, style: 'subheader' });
          content.push({ table: { body: buildTable(moduleData.items) }, margin: [0, 0, 0, 15] });
        }
      } else {
        content.push({ table: { body: buildTable(reportData) } });
      }

      const docDefinition = {
        content,
        defaultStyle: {
          font: 'Roboto',
          fontSize: 8 // Reducido de 9 a 8
        },
        styles: {
          header: { fontSize: 14, bold: true, margin: [0, 0, 0, 10], color: '#2c3e50' }, // Tamaño reducido y color corporativo
          subheader: { fontSize: 10, bold: true, margin: [0, 10, 0, 5], color: '#34495e' }, // Tamaño reducido y color corporativo
          tableHeader: { bold: true, fontSize: 9, color: 'white', fillColor: '#34495e', margin: [0, 5, 0, 5] }, // Estilo para encabezados de tabla
          notes: { fontSize: 7, italics: true, margin: [0, 10, 0, 0]} // Estilo para notas al pie o información adicional
        },
        pageOrientation: 'landscape',
        footer: function(currentPage, pageCount) {
          return { text: `Página ${currentPage.toString()} de ${pageCount}`, alignment: 'center', style: 'notes' };
        },
        header: function(currentPage, pageCount, pageSize) {
          // Podría añadir un logo aquí si estuviera disponible
          return {
            text: 'Reporte Corporativo', // Placeholder para un título o logo
            alignment: 'center',
            margin: [0, 10, 0, 10],
            fontSize: 10,
            bold: true,
            color: '#2c3e50'
          };
        }
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      pdfDoc.pipe(res);
      pdfDoc.end();

    } else if (format === 'csv') {
      let csvData = [];

      const headerTranslations = { // Asegurarse de que las traducciones estén disponibles aquí también
        name: 'Nombre',
        type: 'Tipo',
        description: 'Descripción',
        status: 'Estado',
        model: 'Modelo',
        serialNumber: 'Número de Serie',
        acquisitionDate: 'Fecha de Adquisición',
        maintenanceDate: 'Fecha de Mantenimiento',
        location: 'Ubicación',
        brand: 'Marca',
        quantity: 'Cantidad',
        unit: 'Unidad',
        purchaseDate: 'Fecha de Compra',
        provider: 'Proveedor',
        price: 'Precio',
        amount: 'Monto',
        date: 'Fecha',
        category: 'Categoría',
        plate: 'Placa',
        year: 'Año',
        fuelType: 'Tipo de Combustible',
        capacity: 'Capacidad',
        consumption: 'Consumo',
        startDate: 'Fecha de Inicio',
        endDate: 'Fecha de Fin',
        client: 'Cliente',
        details: 'Detalles',
      };

      const appendData = (items, moduleName) => {
        if (!Array.isArray(items) || items.length === 0) return;
        const originalKeys = Object.keys(items[0]).filter(k => k !== '_id' && k !== '__v');
        const translatedKeys = originalKeys.map(k => headerTranslations[k] || k);
        
        csvData.push([`${moduleName.toUpperCase()}`]);
        csvData.push(translatedKeys); // Usar encabezados traducidos
        items.forEach(item => {
          csvData.push(originalKeys.map(k => item[k] ?? '')); // Los datos siguen usando las claves originales
        });
        csvData.push([]);
      };

      if (reportType === 'general') {
        for (const [moduleName, moduleData] of Object.entries(reportData)) {
          appendData(moduleData.items, moduleName);
        }
      } else {
        appendData(reportData, reportType);
      }

      const csvString = stringify(csvData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      res.send(csvString);
    } else {
      return res.status(400).json({ msg: 'Formato de reporte no soportado' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error del servidor');
  }
});

export default router;
