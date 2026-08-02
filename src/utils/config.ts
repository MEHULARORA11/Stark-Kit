import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url';


const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName)

const envPath = path.join(dirName, '../../','.env');
dotenv.config({path:envPath})


const config = {
    OPENAI_API_KEY:process.env.OPENAI_API_KEY
}
