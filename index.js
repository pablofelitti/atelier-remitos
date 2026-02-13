const pdfLib = require('pdf-lib')
const fs = require('fs')
const readline = require('readline')

const JsBarcode = require('jsbarcode')
const Canvas = require("canvas")

const DOWNLOADS_PATH = '/Users/pablofelitti/Downloads'

function createImageBuffer(barcodeValue) {
    let canvas = Canvas.createCanvas()
    JsBarcode(canvas, barcodeValue, {
        margin: 0
    })
    return canvas.toBuffer("image/png");
}

function addLeadingZeroes(num, totalDigits) {
    if (totalDigits - num.toString().length > 0) {
        let zeroes = ''
        for (let i = 0; i < totalDigits - num.toString().length; i++) {
            zeroes = zeroes + '0'
        }
        return zeroes + num.toString()
    }
    return num
}

async function processRemitoRosmino() {
    let files = fs.readdirSync(DOWNLOADS_PATH)
    let pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'))
    console.log(`Se encontraron ${pdfFiles.length} archivos PDF`)

    for (let idx = 0; idx < pdfFiles.length; idx++) {
        const file = pdfFiles[idx]

        try {
            console.log(`[${idx + 1}/${pdfFiles.length}] Procesando ${file}...`)
            let filenameWithoutExtension = file.split('.')[0]
            let filenameExtension = file.split('.')[1]

            let filenameTokens = file.split('.')[0].split('-');
            filenameTokens[0] = parseInt(filenameTokens[0])
            filenameTokens[1] = parseInt(filenameTokens[1])

            let chunk = fs.readFileSync(DOWNLOADS_PATH + '/' + file)

            const pdfDoc = await pdfLib.PDFDocument.load(chunk)
            const pages = pdfDoc.getPages()

            for (let i = 0; i < pages.length; i++) {

                let page = pages[i];

                let token0 = addLeadingZeroes(filenameTokens[0], 8);
                let token1 = addLeadingZeroes(filenameTokens[1], 8);

                const imageBuffer1 = createImageBuffer(token0);
                const imageBuffer2 = createImageBuffer(token1);
                const pngImage1 = await pdfDoc.embedPng(imageBuffer1)
                const pngImage2 = await pdfDoc.embedPng(imageBuffer2)

                const pngDims1 = pngImage1.scale(0.4)
                const pngDims2 = pngImage2.scale(0.4)

                page.drawImage(pngImage1, {
                    x: 565,
                    y: 175,
                    width: pngDims1.width,
                    height: pngDims1.height,
                    rotate: pdfLib.degrees(90)
                })

                page.drawImage(pngImage2, {
                    x: 565,
                    y: 645,
                    width: pngDims2.width,
                    height: pngDims2.height,
                    rotate: pdfLib.degrees(90)
                })

                filenameTokens[0]++
                filenameTokens[1]++
            }

            fs.writeFileSync(DOWNLOADS_PATH + '/' + filenameWithoutExtension + '-barcode.' + filenameExtension, await pdfDoc.save());
            console.log(`[${idx + 1}/${pdfFiles.length}] ${file} -> ${filenameWithoutExtension}-barcode.${filenameExtension}`)
        } catch (e) {
            console.log(`[${idx + 1}/${pdfFiles.length}] Error procesando ${file}:`, e)
        }
    }
}

async function processNotaPedidoRosmino() {
    let files = fs.readdirSync(DOWNLOADS_PATH)
    let pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'))
    console.log(`Se encontraron ${pdfFiles.length} archivos PDF`)

    for (let idx = 0; idx < pdfFiles.length; idx++) {
        const file = pdfFiles[idx]

        try {
            console.log(`[${idx + 1}/${pdfFiles.length}] Procesando ${file}...`)
            let filenameWithoutExtension = file.split('.')[0]
            let filenameExtension = file.split('.')[1]

            let filenameToken = parseInt(file.split('.')[0])

            let chunk = fs.readFileSync(DOWNLOADS_PATH + '/' + file)

            const pdfDoc = await pdfLib.PDFDocument.load(chunk)
            const pages = pdfDoc.getPages()

            for (const page of pages) {

                let token = addLeadingZeroes(filenameToken, 8);

                const imageBuffer = createImageBuffer(token);
                const pngImage = await pdfDoc.embedPng(imageBuffer)

                const pngDims = pngImage.scale(0.4)

                page.drawImage(pngImage, {
                    x: 475,
                    y: 746,
                    width: pngDims.width,
                    height: pngDims.height
                })

                filenameToken++
            }

            fs.writeFileSync(DOWNLOADS_PATH + '/' + filenameWithoutExtension + '-barcode.' + filenameExtension, await pdfDoc.save());
            console.log(`[${idx + 1}/${pdfFiles.length}] ${file} -> ${filenameWithoutExtension}-barcode.${filenameExtension}`)
        } catch (e) {
            console.log(`[${idx + 1}/${pdfFiles.length}] Error procesando ${file}:`, e)
        }
    }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

console.log('Seleccione el tipo de procesamiento:')
console.log('1) Remito Rosmino')
console.log('2) Nota de Pedido Rosmino')

rl.question('Opcion: ', async (answer) => {
    rl.close()

    if (answer === '1') {
        await processRemitoRosmino()
    } else if (answer === '2') {
        await processNotaPedidoRosmino()
    } else {
        console.log('Opcion invalida')
        process.exit(1)
    }

    console.log('Listo!')
})
