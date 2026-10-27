import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../common/enums/role.enum.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import { Product } from './entities/product.entity.js';
import { ProductsService } from './products.service.js';

describe('ProductsService', () => {
  let service: ProductsService;

  const repo = {
    findOne: vi.fn(),
    findAndCount: vi.fn(),
    save: vi.fn(),
    create: vi.fn((data) => data),
    softDelete: vi.fn(),
  };

  const dataSource = {
    transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  describe('findOne', () => {
    it('lanza NotFoundException cuando el producto no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('id-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('devuelve el producto cuando existe', async () => {
      const mockProduct = { id: 'p1', name: 'Teclado' };
      repo.findOne.mockResolvedValue(mockProduct);
      const result = await service.findOne('p1');
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    const regularUser: JwtPayload = { sub: 'user-1', email: 'u1@mail.com', role: Role.USER };
    const adminUser: JwtPayload = { sub: 'admin-1', email: 'admin@mail.com', role: Role.ADMIN };

    it('lanza ForbiddenException si el usuario no es dueño ni admin', async () => {
      const product = { id: 'p1', ownerId: 'other-user', name: 'Original' };
      repo.findOne.mockResolvedValue(product);

      await expect(service.update('p1', { name: 'Modificado' }, regularUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('permite al admin modificar el producto de otro usuario', async () => {
      const product = { id: 'p1', ownerId: 'other-user', name: 'Original' };
      repo.findOne.mockResolvedValue(product);
      repo.save.mockImplementation(async (item) => item);

      const result = await service.update('p1', { name: 'Modificado' }, adminUser);
      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe('Modificado');
    });

    it('permite al dueño modificar su propio producto', async () => {
      const product = { id: 'p1', ownerId: 'user-1', name: 'Original' };
      repo.findOne.mockResolvedValue(product);
      repo.save.mockImplementation(async (item) => item);

      const result = await service.update('p1', { name: 'Modificado' }, regularUser);
      expect(repo.save).toHaveBeenCalled();
      expect(result.name).toBe('Modificado');
    });
  });

  describe('findAll', () => {
    it('aplica paginación correctamente con skip y take', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ page: 2, limit: 5 });

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });
  });
});
