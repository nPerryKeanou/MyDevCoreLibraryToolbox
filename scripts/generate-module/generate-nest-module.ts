import * as fs from 'fs-extra';
import * as path from 'path';
import picocolors from 'picocolors';

// --- Utilitaires de nommage ---
const toPascalCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
const toCamelCase = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);
const toKebabCase = (str: string) => str.replace(/([a-z0) ([A-Z])/g, '$1-$2').toLowerCase();

async function generateCrud() {
    const args = process.argv.slice(2);
    const rawName = args[0];

    if (!rawName) {
        console.log(picocolors.red("❌ Erreur: Tu dois fournir un nom de module"));
        console.log(picocolors.yellow("Usage: npm run gen:crud -- ModuleName"));
        process.exit(1);
    }

    const name = {
        pascal: toPascalCase(rawName),
        camel: toCamelCase(rawName),
        kebab: toKebabCase(rawName)
    };

    // Chemin de destination (adapte selon ton architecture)
    const targetDir = path.join(process.cwd(), 'apps/api/src', name.kebab);

    console.log(picocolors.blue(`🚀 Génération du module CRUD: ${name.pascal}`));

    // Vérification du dossier
    if (await fs.pathExists(targetDir)) {
        console.log(picocolors.yellow(`⚠️ Le dossier ${name.kebab} existe déjà.`));
        // Note: Pour faire un prompt "Y/n" en Node, on utilise souvent 'readline'
        // Pour simplifier ici, on s'arrête si ça existe.
        process.exit(1);
    }

    await fs.ensureDir(targetDir);

    // --- Template du Service ---
    const serviceTemplate = `
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ${name.pascal}, Prisma } from '@prisma/client';

@Injectable()
export class ${name.pascal}Service {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.${name.pascal}CreateInput) {
    return this.prisma.${name.camel}.create({ data });
  }

  async findAll() {
    return this.prisma.${name.camel}.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.${name.camel}.findUnique({
      where: { ${name.camel}Id: BigInt(id) },
    });
    if (!item) throw new NotFoundException(\`ID \${id} non trouvé\`);
    return item;
  }
}
    `;

    // --- Écriture des fichiers ---
    const files = [
        { name: `${name.kebab}.service.ts`, content: serviceTemplate },
        // Ajoute ici les templates pour controller, module, et spec...
    ];

    for (const file of files) {
        await fs.writeFile(path.join(targetDir, file.name), file.content.trim());
        console.log(picocolors.green(`✓ Créé: ${file.name}`));
    }

    console.log(picocolors.cyan("\n✅ Module généré avec succès !"));
}

generateCrud().catch(err => console.error(err));