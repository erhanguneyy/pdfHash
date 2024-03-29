const express = require('express')
const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser')
const fileUpload = require('express-fileupload');

const app = express()
const port = 3010
app.use(fileUpload());

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const characters = '0123456789';
function generateString(length) {
    let result = ' ';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

app.post('/hashPdf', async (req, res) => {
    try {

        const newPDF = {
            host: req.body.host,
            port: req.body.port,
            secure: req.body.secure,
            mailTo: req.body.mailTo,
            user: req.body.user,
            pass: req.body.pass,
            pdf: req.body.pdf,
            pdfPassword: req.body.pdfPassword
        }

        const transporter = nodemailer.createTransport({
            host: newPDF.host,
            port: newPDF.port,
            tls: {
                rejectUnauthorized: false
            },
            auth: {
                user: newPDF.user,
                pass: newPDF.pass
            }
        });

        const localPDF = req.files.pdf
        uploadPath = __dirname + "/noHashPDF/" + localPDF.name

        localPDF.mv(uploadPath, function (err) {
            if (err)
                return res.status(500).send(err);
        });
        setTimeout(() => {
            const credentials = PDFServicesSdk.Credentials
                .servicePrincipalCredentialsBuilder()
                .withClientId("")
                .withClientSecret("")
                .build();

            const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);

            const protectPDF = PDFServicesSdk.ProtectPDF,
                options = new protectPDF.options.PasswordProtectOptions.Builder()
                    .setUserPassword(newPDF.pdfPassword)
                    .setEncryptionAlgorithm(PDFServicesSdk.ProtectPDF.options.EncryptionAlgorithm.AES_256)
                    .build();

            const newPdfName = generateString(16)
            const protectPDFOperation = protectPDF.Operation.createNew(options);
            const input = PDFServicesSdk.FileRef.createFromLocalFile(uploadPath);
            protectPDFOperation.setInput(input);
            protectPDFOperation.execute(executionContext)
                .then(result => {
                    const hashPdf = __dirname + '/hshPdf/' + 'Maaş Zarfı - ' + newPdfName
                    result.saveAsFile(hashPdf)
                    res.status(200).json('PDF Oluşturuldu')
                    var mailOptions = {
                        from: newPDF.user,
                        to: newPDF.mailTo,
                        subject: 'Maaş Zarfı',
                        attachments: [
                            {
                                path: hashPdf + '.pdf'
                            }
                        ]
                    };
                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ' + info.response);
                        }
                    });
                })
                .catch(err => {
                    if (err instanceof PDFServicesSdk.Error.ServiceApiError
                        || err instanceof PDFServicesSdk.Error.ServiceUsageError) {
                        console.log('İşlem sırasında hata oluştu', err);
                    } else {
                        console.log('İşlem sırasında hata oluştu', err);
                    }
                });

            console.log('OK');



        }, "1500");
    } catch (err) {
        console.log('İşlem sırasında hata oluştu', err);
    }
})






app.listen(port, () => {
    console.log('http://localhost:3010');
})
