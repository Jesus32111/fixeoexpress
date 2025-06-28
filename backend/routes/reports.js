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
// Import pdfMake library instance and pdfFonts (vfs)
import pdfMake from 'pdfmake/build/pdfmake.js';
import pdfFonts from 'pdfmake/build/vfs_fonts.js';

// Assign vfs to pdfMake instance
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else {
  console.error("Failed to load pdfmake vfs fonts. pdfFonts structure:", pdfFonts);
  // Fallback or error handling if fonts are not loaded correctly
  // This might happen if the structure of vfs_fonts.js output changes
  // or if the import itself fails silently for some reason.
}


const router = express.Router();

// Define fonts for PdfPrinter
// The PdfPrinter constructor expects font descriptors.
// We need to ensure that the font files (e.g., 'Roboto-Regular.ttf') are found within pdfMake.vfs
const printer = new PdfPrinter({
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  }
});

// The Buffer.from(...) calls are not needed here if pdfMake.vfs is correctly populated.
// pdfMake will resolve these font names against its virtual file system.

// pdfmake instance doesn't need to be created separately with `new PdfPrinter()`
// and vfs fonts are typically assigned directly to the PdfPrinter import if needed,
// but modern pdfmake handles this internally or through constructor.
// For the direct vfs assignment as it was:
// import pdfMake from 'pdfmake'; // This would be problematic with PdfPrinter class
// pdfMake.vfs = vfsFonts.pdfMake.vfs; // This line is tricky with ES6 modules.
// It's better if PdfPrinter handles vfs internally or via constructor options.
// The original code implies `pdfMake` is a global or a different import than `PdfPrinter`.
// Let's assume `PdfPrinter` is the main class and it handles its own fonts or
// we might need to find a different way to set vfs if `pdfMake.vfs = ...` was for a global instance.

// If pdfMake.vfs is essential and refers to a global or specific instance used by PdfPrinter,
// and considering PdfPrinter is the class, we might not need `pdfMake.vfs = ...` if
// vfsFonts are correctly passed or available to the printer instance.
// Given the original code `const PdfPrinter = require('pdfmake');` and then `pdfMake.vfs = ...`,
// it seems `pdfmake` (lowercase) was expected to be the library object itself, not the class.
// With ES6 `import PdfPrinter from 'pdfmake'`, PdfPrinter is the class.
// The `vfs_fonts.js` itself usually sets `pdfMake.vfs`.
// Let's ensure vfsFonts are available. The `import vfsFonts from 'pdfmake/build/vfs_fonts.js'`
// should execute the file, which often has a side effect of setting `pdfMake.vfs`.
// If `pdfMake` is not a global, this might still be an issue.
// A common pattern for pdfmake with ES6 is:
// import PdfPrinter from 'pdfmake';
// import pdfMake from 'pdfmake/build/pdfmake.js'; // Import the library instance
// import pdfFonts from 'pdfmake/build/vfs_fonts.js'; // Import the vfs fonts
// pdfMake.vfs = pdfFonts.pdfMake.vfs; // Assign vfs to the library instance

// For now, I will proceed with the assumption that importing vfsFonts will make them available
// or that the PdfPrinter class handles them correctly. The critical part is `vfsFonts.pdfMake.vfs`.

// Assign vfs to global pdfMake instance if that's how pdfmake expects it.
// This line was present in the original CommonJS and is crucial for pdfmake to find fonts.
// When 'pdfmake/build/vfs_fonts.js' is imported, it typically populates a global `pdfMake.vfs`.
// So, simply importing it should be enough. If `pdfMake` is not automatically global,
// we might need to import `pdfMake` from `pdfmake/build/pdfmake.js` first and then assign `vfsFonts.pdfMake.vfs` to its `vfs` property.
// import pdfMake from 'pdfmake/build/pdfmake.js';
// pdfMake.vfs = vfsFonts.pdfMake.vfs;
// For now, let's assume the import of vfs_fonts.js is sufficient.

// Function to generate PDF document definition
const generateReportDocDefinition = (reportData) => {
  const { reportType, data, generatedBy, createdAt } = reportData;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const moduleTranslations = {
    alerts: 'Alertas',
    finance: 'Finanzas',
    fuel: 'Combustible',
    machinery: 'Maquinaria',
    parts: 'Repuestos',
    rentals: 'Alquileres',
    tools: 'Herramientas',
    vehicles: 'Vehículos',
    warehouses: 'Almacenes',
  };

  let content = [
    { text: `Reporte de ${moduleTranslations[reportType] || reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, style: 'header' },
    {
      columns: [
        { text: `Generado por: ${generatedBy.name}`, style: 'subheaderLeft' },
        { text: `Fecha: ${formatDate(createdAt)}`, style: 'subheaderRight' }
      ],
      margin: [0, 0, 0, 20]
    }
  ];

  const createTable = (items, title) => {
    if (!items || items.length === 0) {
      return [{ text: `No hay datos disponibles para ${title}.`, style: 'italic', margin: [0, 0, 0, 10] }];
    }

    // Normalizar y filtrar las claves, priorizando un conjunto predefinido si existe
    const predefinedKeyOrders = {
      vehicles: ['plate', 'brand', 'model', 'year', 'status', 'assignedTo', 'lastMaintenanceDate', 'nextMaintenanceDate', 'fuelType', 'mileage'],
      machinery: ['name', 'type', 'manufacturer', 'model', 'purchaseDate', 'status', 'location', 'hourlyRate', 'lastMaintenanceDate'],
      tools: ['name', 'type', 'quantity', 'location', 'purchaseDate', 'status'],
      parts: ['name', 'partNumber', 'quantity', 'supplier', 'price', 'location'],
      fuel: ['vehicleId', 'date', 'liters', 'cost', 'mileageBefore', 'mileageAfter'],
      finance: ['type', 'category', 'description', 'amount', 'date', 'relatedTo'],
      alerts: ['type', 'message', 'severity', 'status', 'relatedTo', 'dueDate'],
      rentals: ['customerName', 'itemType', 'itemId', 'startDate', 'endDate', 'totalAmount', 'status'],
      warehouses: ['name', 'location', 'capacity', 'manager'],
      // Añadir más según sea necesario
    };

    let itemKeys = [];
    if (items.length > 0) {
      // Usar el orden predefinido si existe para el tipo de reporte actual
      const currentReportTypeForKeys = reportType === 'general' 
          ? Object.keys(moduleTranslations).find(mtKey => moduleTranslations[mtKey] === title) // Mapear título a reportType
          : reportType;

      if (currentReportTypeForKeys && predefinedKeyOrders[currentReportTypeForKeys]) {
        itemKeys = predefinedKeyOrders[currentReportTypeForKeys].filter(key => 
            items.some(item => item.hasOwnProperty(key) && item[key] !== null && item[key] !== undefined)
        );
        // Añadir claves restantes que no están en el orden predefinido pero sí en los datos
        const remainingKeys = Object.keys(items[0] || {})
            .filter(key => !itemKeys.includes(key) && key !== '_id' && key !== '__v' && typeof items[0][key] !== 'object');
        itemKeys.push(...remainingKeys);

      } else {
        // Fallback: extraer claves del primer objeto si no hay orden predefinido
        itemKeys = Object.keys(items[0] || {})
          .filter(key => key !== '_id' && key !== '__v' && typeof items[0][key] !== 'object');
      }
    }
     // Si itemKeys sigue vacío (p.ej. items está vacío o todos los objetos son vacíos), no generar tabla.
    if (itemKeys.length === 0) {
        return [{ text: `No hay datos tabulables para ${title}.`, style: 'italic', margin: [0, 0, 0, 10] }];
    }


    const tableHeader = itemKeys.map(key => ({ text: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'), style: 'tableHeader' }));
    
    const tableBody = items.map(item => {
      return itemKeys.map(key => {
        let value = item[key];
        if (typeof value === 'boolean') {
          value = value ? 'Sí' : 'No';
        } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)) && (value.includes('T') || value.includes('-') || /^\d{4}-\d{2}-\d{2}$/.test(value)) ) ) {
            try {
                 value = formatDate(value);
            } catch (e) {
                // if not a valid date, keep original value
            }
        } else if (typeof value === 'number' && (key.toLowerCase().includes('price') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('rate'))) {
          value = `S/ ${value.toFixed(2)}`;
        }
        return String(value === undefined || value === null ? 'N/A' : value);
      });
    });

    return [
      { text: title, style: 'moduleHeader', margin: [0,10,0,5] },
      {
        table: {
          headerRows: 1,
          widths: Array(itemKeys.length).fill('*'), // Distribuir columnas equitativamente
          body: [tableHeader, ...tableBody],
        },
        layout: {
          fillColor: function (rowIndex, node, columnIndex) {
            return (rowIndex === 0) ? '#CCCCCC' : null;
          },
          hLineWidth: function (i, node) {
						return (i === 0 || i === node.table.body.length) ? 1 : 1;
					},
					vLineWidth: function (i, node) {
						return (i === 0 || i === node.table.widths.length) ? 1 : 1;
					},
					hLineColor: function (i, node) {
						return (i === 0 || i === node.table.body.length) ? 'black' : 'gray';
					},
					vLineColor: function (i, node) {
						return (i === 0 || i === node.table.widths.length) ? 'black' : 'gray';
					},
          paddingTop: function(i, node) { return 5; },
					paddingBottom: function(i, node) { return 5; },
        }
      },
      { text: `Total de registros: ${items.length}`, style: 'totalCount', margin: [0, 5, 0, 15] }
    ];
  };


  if (reportType === 'general') {
    for (const moduleKey in data) {
      const moduleName = moduleTranslations[moduleKey] || moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1);
      if (data[moduleKey] && data[moduleKey].items) {
        content.push(...createTable(data[moduleKey].items, moduleName));
      } else {
        content.push({ text: moduleName, style: 'moduleHeader' });
        content.push({ text: `No hay datos disponibles para ${moduleName}.`, style: 'italic', margin: [0,0,0,10] });
      }
    }
  } else {
    const moduleName = moduleTranslations[reportType] || reportType.charAt(0).toUpperCase() + reportType.slice(1);
    content.push(...createTable(Array.isArray(data) ? data : (data.items || []), moduleName));
  }

  return {
    content: content,
    styles: {
      header: {
        fontSize: 22,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10],
        color: '#333333'
      },
      subheaderLeft: {
        fontSize: 10,
        alignment: 'left',
        color: '#555555'
      },
      subheaderRight: {
        fontSize: 10,
        alignment: 'right',
        color: '#555555'
      },
      moduleHeader: {
        fontSize: 16,
        bold: true,
        margin: [0, 15, 0, 8],
        color: '#444444',
        decoration: 'underline',
        decorationColor: '#DDDDDD'
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: '#FFFFFF', // White text for header
        fillColor: '#4A90E2', // Blue background for header
        alignment: 'center'
      },
      italic: {
        italics: true,
        color: '#777777'
      },
      totalCount: {
          fontSize: 9,
          alignment: 'right',
          color: '#666666',
          margin: [0,5,0,10]
      },
      footerText: { // Added footerText style here
        fontSize: 8,
        color: '#AAAAAA',
        italics: true
      }
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      lineHeight: 1.3
    },
    pageMargins: [40, 60, 40, 60], // [left, top, right, bottom]
    footer: function(currentPage, pageCount) {
      return {
        columns: [
          { text: `Generado por: Sistema de Gestión Taller Antony`, alignment: 'left', style: 'footerText' },
          { text: `Página ${currentPage.toString()} de ${pageCount}`, alignment: 'right', style: 'footerText' }
        ],
        margin: [40, 0, 40, 20] // Adjust margin for footer
      };
    }
    // styles: { // This was causing a redefinition, consolidated into the main styles object above
    //     ...this.styles, 
    //     footerText: {
    //         fontSize: 8,
    //         color: '#AAAAAA',
    //         italics: true
    //     }
    // }
  };
};


// @route   POST api/reports/:type
// @desc    Generate a report for a specific module or a general report
// @access  Private
router.post('/:type', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const reportType = req.params.type;
    let reportData = {};
    let fileName = `${reportType}_report_${Date.now()}.pdf`;

    if (reportType === 'general') {
      reportData = {
        alerts: { count: await Alert.countDocuments(), items: await Alert.find().lean() },
        finance: { count: await FinanceRecord.countDocuments(), items: await FinanceRecord.find().lean() },
        fuel: { count: await FuelRecord.countDocuments(), items: await FuelRecord.find().lean()},
        machinery: { count: await Machinery.countDocuments(), items: await Machinery.find().lean() },
        parts: { count: await Part.countDocuments(), items: await Part.find().lean() },
        rentals: { count: await Rental.countDocuments(), items: await Rental.find().lean() },
        tools: { count: await Tool.countDocuments(), items: await Tool.find().lean() },
        vehicles: { count: await Vehicle.countDocuments(), items: await Vehicle.find().lean() },
        warehouses: { count: await Warehouse.countDocuments(), items: await Warehouse.find().lean() },
      };
    } else {
      let model;
      switch (reportType) {
        case 'alerts': model = Alert; break;
        case 'finance': model = FinanceRecord; break;
        case 'fuel': model = FuelRecord; break;
        case 'machinery': model = Machinery; break;
        case 'parts': model = Part; break;
        case 'rentals': model = Rental; break;
        case 'tools': model = Tool; break;
        case 'vehicles': model = Vehicle; break;
        case 'warehouses': model = Warehouse; break;
        default: return res.status(400).json({ msg: 'Tipo de reporte inválido' });
      }
      const items = await model.find().lean(); // Usar lean() para obtener objetos JS planos
      reportData = items;
    }

    const newReport = new Report({
      generatedBy: user.id,
      reportType: reportType,
      data: reportData,
    });

    await newReport.save();

    const docDefinition = generateReportDocDefinition({
      reportType,
      data: reportData,
      generatedBy: user,
      createdAt: newReport.createdAt
    });

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
});

export default router;
