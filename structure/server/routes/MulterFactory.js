const multer = require('multer');
const fs = require('fs-extra');

const MulterFactory = {

  create: (entity) => {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        // create directory if not exist
        let dir = `public/files/${groupDir}/${entity}`;
        fs.ensureDirSync(dir)
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        let ext = file.originalname.split('.').slice(-1)[0];
        const name = `${file.fieldname}-${Date.now().toString()}.${ext}`;
        cb(null,  name);
      }
    });

    return multer({ storage });
  }
}

module.exports = MulterFactory;