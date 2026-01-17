import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import { join } from 'path'
import Field from '../../models/Field'
import EducationLevel from '../../models/EducationLevel'
import { EducationStructureService } from '../../lib/services/EducationStructureService'

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env')
    process.exit(1)
}

async function check() {
    try {
        await mongoose.connect(MONGODB_URI as string)
        console.log('Connected to MongoDB')

        // 1. List all levels
        const levels = await EducationLevel.find({}).lean()
        console.log(`Found ${levels.length} levels`)
        levels.forEach(l => console.log(`- [${l._id}] ${l.name} (${l.cycle})`))

        // 2. List all fields
        const fields = await Field.find({}).lean()
        console.log(`\nFound ${fields.length} fields`)
        fields.forEach(f => {
            console.log(`- [${f._id}] ${f.name} (${f.subSystem})`)
            console.log(`  Applicable Levels: ${f.applicableLevels.join(', ')}`)
        })

        // 3. Simulate query for a Lycée level (e.g., Seconde)
        const seconde = levels.find(l => l.name === 'Seconde')
        if (seconde) {
            console.log(`\nQuerying fields for Seconde [${seconde._id}]...`)
            const results = await EducationStructureService.getFields({ level: seconde._id.toString() })
            console.log(`Found ${results.length} fields:`)
            results.forEach(f => console.log(`- ${f.name}`))
        } else {
            console.log('\nSeconde level not found!')
        }

        process.exit(0)
    } catch (error) {
        console.error('Error:', error)
        process.exit(1)
    }
}

check()
