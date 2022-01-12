const express = require('express')
const pdfLib = require('pdf-lib')
const fs = require('fs')

const JsBarcode = require('jsbarcode')
const Canvas = require("canvas")


const app = express()

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

app.get('/factura-rosmino', async function (req, res) {
    let path = '/Users/pablofelitti/Downloads'

    let files = fs.readdirSync(path)

    for (const file of files) {

        try {
            if (!file.toLowerCase().endsWith('.pdf')) continue;
            let filenameWithoutExtension = file.split('.')[0]
            let filenameExtension = file.split('.')[1]

            let filenameTokens = file.split('.')[0].split('-');
            filenameTokens[1] = parseInt(filenameTokens[1])
            filenameTokens[2] = parseInt(filenameTokens[2])

            let chunk = fs.readFileSync(path + '/' + file)

            const pdfDoc = await pdfLib.PDFDocument.load(chunk)
            const pages = pdfDoc.getPages()

            for (const page of pages) {

                let token2 = addLeadingZeroes(filenameTokens[1], 8);

                let token4 = addLeadingZeroes(filenameTokens[3], 8);

                const imageBuffer1 = createImageBuffer(token2);
                const imageBuffer2 = createImageBuffer(token4);
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

                filenameTokens[1]--
                filenameTokens[3]--
            }

            fs.writeFileSync(path + '/' + filenameWithoutExtension + '-barcode.' + filenameExtension, await pdfDoc.save());
        } catch (e) {
            console.log(e)
        }
    }

    res.send('Done!')
})

app.get('/remito-rosmino', async function (req, res) {
    let path = '/Users/pablofelitti/Downloads'

    let files = fs.readdirSync(path)

    for (const file of files) {

        try {
            if (!file.toLowerCase().endsWith('.pdf')) continue;
            let filenameWithoutExtension = file.split('.')[0]
            let filenameExtension = file.split('.')[1]

            let filenameToken = parseInt(file.split('.')[0])

            let chunk = fs.readFileSync(path + '/' + file)

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

            fs.writeFileSync(path + '/' + filenameWithoutExtension + '-barcode.' + filenameExtension, await pdfDoc.save());
        } catch (e) {
            console.log(e)
        }
    }

    res.send('Done!')
})

app.listen(3000)