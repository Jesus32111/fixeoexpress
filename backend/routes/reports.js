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

  const headers = Object.keys(items[0]).filter(k => !['_id', '__v'].includes(k));
  const rows = items.map(item =>
    headers.map(h => String(item[h] ?? ''))
  );

  return [headers, ...rows];
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
          fontSize: 9
        },
        styles: {
          header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
          subheader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] }
        },
        pageOrientation: 'landscape'
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      pdfDoc.pipe(res);
      pdfDoc.end();

    } else if (format === 'csv') {
      let csvData = [];

      const appendData = (items, moduleName) => {
        if (!Array.isArray(items) || items.length === 0) return;
        const keys = Object.keys(items[0]).filter(k => k !== '_id' && k !== '__v');
        csvData.push([`${moduleName.toUpperCase()}`]);
        csvData.push(keys);
        items.forEach(item => {
          csvData.push(keys.map(k => item[k] ?? ''));
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
