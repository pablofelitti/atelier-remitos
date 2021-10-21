const express = require('express')
const pdfLib = require('pdf-lib')
const fs = require('fs')

const JsBarcode = require('jsbarcode')
const Canvas = require("canvas")


const app = express()

function createImageBuffer(barcodeValue) {
    let canvas = Canvas.createCanvas()
    JsBarcode(canvas, barcodeValue)
    return canvas.toBuffer("image/png");
}

app.get('/', async function (req, res) {
    let path = '/Users/pablofelitti/Downloads'

    let files = fs.readdirSync(path)

    for (const file of files) {

        try {
            if (!file.toLowerCase().endsWith('.pdf')) continue;
            let filenameWithoutExtension = file.split('.')[0]
            let filenameExtension = file.split('.')[1]

            let filenameTokens = file.split('.')[0].split('-');

            let chunk = fs.readFileSync(path + '/' + file)

            const pdfDoc = await pdfLib.PDFDocument.load(chunk)
            const pages = pdfDoc.getPages()

            for (const page of pages) {

                const imageBuffer1 = createImageBuffer(filenameTokens[0]);
                const imageBuffer2 = createImageBuffer(filenameTokens[1]);
                const pngImage1 = await pdfDoc.embedPng(imageBuffer1)
                const pngImage2 = await pdfDoc.embedPng(imageBuffer2)

                const pngDims1 = pngImage1.scale(0.4)
                const pngDims2 = pngImage2.scale(0.4)

                page.drawImage(pngImage1, {
                    x: 565,
                    y: 125,
                    width: pngDims1.width,
                    height: pngDims1.height,
                    rotate: pdfLib.degrees(90)
                })

                page.drawImage(pngImage2, {
                    x: 565,
                    y: 595,
                    width: pngDims2.width,
                    height: pngDims2.height,
                    rotate: pdfLib.degrees(90)
                })

                filenameTokens[0]++
                filenameTokens[1]++
            }

            fs.writeFileSync(path + '/' + filenameWithoutExtension + '-barcode.' + filenameExtension, await pdfDoc.save());
        } catch (e) {
            console.log(e)
        }
    }

    res.send('Hello World')
})

app.listen(3000)