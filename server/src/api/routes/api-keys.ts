import { Router } from 'express';
import { z } from 'zod';
import { apiKeyRepo } from '../../db/repositories/api-key.repo';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).optional(),
});

// List all API keys (masked)
router.get('/api-keys', authMiddleware, (_req, res) => {
  const keys = apiKeyRepo.findAll();
  res.json(keys.map(k => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.key_prefix,
    permissions: JSON.parse(k.permissions),
    isActive: !!k.is_active,
    lastUsedAt: k.last_used_at,
    createdAt: k.created_at,
  })));
});

// Create a new API key
router.post('/api-keys', authMiddleware, (req, res) => {
  const data = CreateApiKeySchema.parse(req.body);
  const { apiKey, rawKey } = apiKeyRepo.create({
    name: data.name,
    permissions: data.permissions,
  });

  // rawKey is only returned once at creation time
  res.status(201).json({
    id: apiKey.id,
    name: apiKey.name,
    key: rawKey,
    keyPrefix: apiKey.key_prefix,
    permissions: JSON.parse(apiKey.permissions),
    createdAt: apiKey.created_at,
  });
});

// Revoke/delete an API key
router.delete('/api-keys/:id', authMiddleware, (req, res) => {
  const id = req.params.id as string;
  const deleted = apiKeyRepo.delete(id);
  if (!deleted) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }
  res.status(204).send();
});

export default router;
