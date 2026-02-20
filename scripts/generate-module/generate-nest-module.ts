import * as fs from 'fs-extra';
import * as path from 'path';
import pc from 'picocolors';

// --- Helpers de formatage ---
const toPascalCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
const toCamelCase = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);
const toKebabCase = (str: string) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

async function generateNestTddModule() {
    const args = process.argv.slice(2);
    const rawName = args[0];

    if (!rawName) {
        console.log(pc.red("❌ Erreur: Tu dois fournir un nom de module (ex: Media)"));
        process.exit(1);
    }

    const name = {
        pascal: toPascalCase(rawName),
        camel: toCamelCase(rawName),
        kebab: toKebabCase(rawName)
    };

    // Chemin cible (à adapter selon ton projet pro)
    const targetDir = path.join(process.cwd(), 'apps/api/src', name.kebab);

    if (await fs.pathExists(targetDir)) {
        console.log(pc.yellow(`⚠️ Le dossier ${name.kebab} existe déjà. Annulation pour protéger ton code.`));
        process.exit(1);
    }

    await fs.ensureDir(targetDir);

    // --- TEMPLATES ---

    const serviceContent = `import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ${name.pascal}, Prisma } from '@prisma/client';

@Injectable()
export class ${name.pascal}Service {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.${name.pascal}CreateInput) {
    return this.prisma.${name.camel}.create({ data });
  }

  async findAll() {
    return this.prisma.${name.camel}.findMany({ where: { deletedAt: null } });
  }

  async findOne(id: string) {
    const item = await this.prisma.${name.camel}.findUnique({ where: { ${name.camel}Id: BigInt(id) } });
    if (!item) throw new NotFoundException(\`${name.pascal} non trouvé\`);
    return item;
  }
}`;

    const serviceSpecContent = `import { Test, TestingModule } from '@nestjs/testing';
import { ${name.pascal}Service } from './${name.kebab}.service';
import { PrismaService } from '../prisma/prisma.service';

describe('${name.pascal}Service', () => {
  let service: ${name.pascal}Service;
  
  const mockPrisma = {
    ${name.camel}: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${name.pascal}Service,
        { provide: PrismaService, useValue: mockPrisma }
      ],
    }).compile();
    service = module.get<${name.pascal}Service>(${name.pascal}Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});`;

    const controllerContent = `import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ${name.pascal}Service } from './${name.kebab}.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('${name.kebab}s')
@UseGuards(JwtAuthGuard)
export class ${name.pascal}Controller {
  constructor(private readonly ${name.camel}Service: ${name.pascal}Service) {}

  @Post()
  create(@Body() data: any) {
    return this.${name.camel}Service.create(data);
  }

  @Get()
  findAll() {
    return this.${name.camel}Service.findAll();
  }
}`;

    const moduleContent = `import { Module } from '@nestjs/common';
import { ${name.pascal}Controller } from './${name.kebab}.controller';
import { ${name.pascal}Service } from './${name.kebab}.service';

@Module({
  controllers: [${name.pascal}Controller],
  providers: [${name.pascal}Service],
  exports: [${name.pascal}Service],
})
export class ${name.pascal}Module {}`;

    // --- CRÉATION DES FICHIERS ---
    const files = [
        { filename: `${name.kebab}.service.ts`, content: serviceContent },
        { filename: `${name.kebab}.service.spec.ts`, content: serviceSpecContent },
        { filename: `${name.kebab}.controller.ts`, content: controllerContent },
        { filename: `${name.kebab}.module.ts`, content: moduleContent },
    ];

    for (const file of files) {
        await fs.writeFile(path.join(targetDir, file.filename), file.content.trim());
        console.log(pc.green(`✓ [Généré] ${file.filename}`));
    }

    console.log(pc.cyan(`\n🚀 Module ${name.pascal} prêt pour le TDD !`));
}

generateNestTddModule().catch(console.error);