import * as fs from 'fs-extra';
import * as path from 'path';
import pc from 'picocolors';

/**
 * INTERFACE : Structure des noms de fichiers et de classes.
 */
interface ModuleNames {
    pascal: string; // Ex: MediaUser
    camel: string;  // Ex: mediaUser
    kebab: string;  // Ex: media-user
}

/**
 * INTERFACE : Structure obligatoire pour chaque ORM supporté.
 */
interface ORMTemplate {
    service: (n: ModuleNames) => string;
    serviceSpec: (n: ModuleNames) => string;
    controller: (n: ModuleNames) => string;
    controllerSpec: (n: ModuleNames) => string;
    module: (n: ModuleNames) => string;
}

/**
 * HELPERS : Utilitaires de formatage de texte.
 */
const toPascalCase = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);
const toCamelCase = (str: string): string => str.charAt(0).toLowerCase() + str.slice(1);
const toKebabCase = (str: string): string => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * CONFIGURATION : Dictionnaire des templates par ORM.
 */
const templates: { PRISMA: ORMTemplate, TYPEORM: ORMTemplate } = {
    PRISMA: {
        service: (n) => `
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ${n.pascal}, Prisma } from '@prisma/client';

@Injectable()
export class ${n.pascal}Service {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.${n.pascal}CreateInput) {
    return this.prisma.${n.camel}.create({ data });
  }

  async findAll() {
    return this.prisma.${n.camel}.findMany({ where: { deletedAt: null } });
  }

  async findOne(id: string) {
    const item = await this.prisma.${n.camel}.findUnique({ where: { ${n.camel}Id: BigInt(id) } });
    if (!item) throw new NotFoundException(\`ID \${id} non trouvé\`);
    return item;
  }
}`,
        serviceSpec: (n) => `import { Test } from '@nestjs/testing';\nimport { ${n.pascal}Service } from './${n.kebab}.service';\nimport { PrismaService } from '../prisma/prisma.service';\n\ndescribe('${n.pascal}Service', () => { /* Tests Prisma */ });`,
        controller: (n) => `
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ${n.pascal}Service } from './${n.kebab}.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('${n.kebab}s')
@UseGuards(JwtAuthGuard)
export class ${n.pascal}Controller {
  constructor(private readonly service: ${n.pascal}Service) {}
  @Post() create(@Body() data: any) { return this.service.create(data); }
  @Get() findAll() { return this.service.findAll(); }
}`,
        controllerSpec: (n) => `import { Test } from '@nestjs/testing';\nimport { ${n.pascal}Controller } from './${n.kebab}.controller';\n\ndescribe('${n.pascal}Controller', () => { /* Tests Controller */ });`,
        module: (n) => `
import { Module } from '@nestjs/common';
import { ${n.pascal}Controller } from './${n.kebab}.controller';
import { ${n.pascal}Service } from './${n.kebab}.service';

@Module({
  controllers: [${n.pascal}Controller],
  providers: [${n.pascal}Service],
  exports: [${n.pascal}Service],
})
export class ${n.pascal}Module {}`
    },
    TYPEORM: {
        service: (n) => `
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${n.pascal}Entity } from './entities/${n.kebab}.entity';

@Injectable()
export class ${n.pascal}Service {
  constructor(
    @InjectRepository(${n.pascal}Entity)
    private readonly repository: Repository<${n.pascal}Entity>
  ) {}

  async findAll() { return this.repository.find(); }
}`,
        serviceSpec: (n) => `import { Test } from '@nestjs/testing';\nimport { ${n.pascal}Service } from './${n.kebab}.service';\n\ndescribe('${n.pascal}Service (TypeORM)', () => { /* Tests TypeORM */ });`,
        controller: (n) => `import { Controller } from '@nestjs/common';\n@Controller('${n.kebab}s')\nexport class ${n.pascal}Controller {}`,
        controllerSpec: (n) => `// Spec TypeORM`,
        module: (n) => `
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${n.pascal}Entity } from './entities/${n.kebab}.entity';
import { ${n.pascal}Service } from './${n.kebab}.service';

@Module({
  imports: [TypeOrmModule.forFeature([${n.pascal}Entity])],
  providers: [${n.pascal}Service],
})
export class ${n.pascal}Module {}`
    }
};

/**
 * AUTO-IMPORT : Mise à jour du app.module.ts
 */
async function updateAppModule(n: ModuleNames) {
    const appModulePath = path.join(process.cwd(), 'apps/api/src/app.module.ts');
    if (!(await fs.pathExists(appModulePath))) return;

    let content = await fs.readFile(appModulePath, 'utf-8');
    const importLine = `import { ${n.pascal}Module } from './${n.kebab}/${n.kebab}.module';\n`;
    
    if (!content.includes(importLine)) content = importLine + content;

    const importsRegex = /(imports\s*:\s*\[)([\s\S]*?)(\])/;
    if (importsRegex.test(content)) {
        content = content.replace(importsRegex, (match, opening, list, closing) => {
            if (list.includes(`${n.pascal}Module`)) return match;
            const hasComma = list.trim().endsWith(',') || list.trim() === "";
            return `${opening}${list}${hasComma ? "" : ","}\n    ${n.pascal}Module,${closing}`;
        });
    }
    await fs.writeFile(appModulePath, content);
    console.log(pc.magenta(`✅ [Auto-Import] ${n.pascal}Module ajouté.`));
}

/**
 * MAIN : Génération du module
 */
async function generateNestTddModule() {
    const args = process.argv.slice(2);
    const rawName = args[0];

    if (!rawName) {
        console.log(pc.red("❌ Erreur: Nom de module manquant."));
        process.exit(1);
    }

    // Détection de l'ORM via le flag --typeorm
    const ormChoice: 'PRISMA' | 'TYPEORM' = args.includes('--typeorm') ? 'TYPEORM' : 'PRISMA';

    const name: ModuleNames = {
        pascal: toPascalCase(rawName),
        camel: toCamelCase(rawName),
        kebab: toKebabCase(rawName)
    };

    const targetDir = path.join(process.cwd(), 'apps/api/src', name.kebab);

    if (await fs.pathExists(targetDir)) {
        console.log(pc.yellow(`⚠️ Le dossier ${name.kebab} existe déjà.`));
        process.exit(1);
    }

    await fs.ensureDir(targetDir);

    // Sélection du template choisi
    const selectedTemplate = templates[ormChoice];

    const files = [
        { filename: `${name.kebab}.service.ts`, content: selectedTemplate.service(name) },
        { filename: `${name.kebab}.service.spec.ts`, content: selectedTemplate.serviceSpec(name) },
        { filename: `${name.kebab}.controller.ts`, content: selectedTemplate.controller(name) },
        { filename: `${name.kebab}.controller.spec.ts`, content: selectedTemplate.controllerSpec(name) },
        { filename: `${name.kebab}.module.ts`, content: selectedTemplate.module(name) },
    ];

    for (const file of files) {
        await fs.writeFile(path.join(targetDir, file.filename), file.content.trim());
        console.log(pc.green(`✓ [Généré avec ${ormChoice}] ${file.filename}`));
    }

    await updateAppModule(name);
    console.log(pc.cyan(`\n🚀 Module ${name.pascal} créé avec succès.`));
}

generateNestTddModule().catch(console.error);