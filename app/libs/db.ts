import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const dataDir = path.join(process.cwd(), 'data');

// Garantir que o diretório data existe
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Interfaces
export interface Mesa {
  id: string;
  numero: number;
  local: string;
  setor: string;
  coberta: boolean;
  capacidade: number;
  preco: number;
  x: number;
  y: number;
  status: 'disponivel' | 'em_analise' | 'reservada';
  lote_id: string | null;
  hold_session_id: string | null;
  hold_expires_at: string | null;
  updated_at: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  created_at: string;
}

export interface PedidoLote {
  id: string;
  codigo: string;
  cliente_id: string;
  status: 'em_analise' | 'parcial' | 'parcial_concluido' | 'reservada' | 'recusado';
  payment_method: 'pix' | 'gerente';
  payment_status: string;
  total: number;
  created_at: string;
}

export interface PedidoMesa {
  id: string;
  pedido_id: string;
  mesa_id: string;
  preco: number;
  status: 'em_analise' | 'reservada' | 'recusada';
  updated_at: string;
}

export interface Gerente {
  id: string;
  username: string;
  password_hash: string;
  ativo: boolean;
  created_at: string;
}

// Funções genéricas CRUD
export function readData<T>(filename: string): T[] {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

export function writeData<T>(filename: string, data: T[]): void {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function createRecord<T extends { id: string }>(filename: string, record: Omit<T, 'id'>): T {
  const records = readData<T>(filename);
  const newRecord = { ...record, id: uuidv4() } as T;
  records.push(newRecord);
  writeData(filename, records);
  return newRecord;
}

export function updateRecord<T extends { id: string }>(filename: string, id: string, updates: Partial<T>): T | null {
  const records = readData<T>(filename);
  const index = records.findIndex(r => r.id === id);
  if (index === -1) return null;
  records[index] = { ...records[index], ...updates };
  writeData(filename, records);
  return records[index];
}

export function deleteRecord<T extends { id: string }>(filename: string, id: string): boolean {
  const records = readData<T>(filename);
  const filtered = records.filter(r => r.id !== id);
  if (filtered.length === records.length) return false;
  writeData(filename, filtered);
  return true;
}

export function getRecord<T extends { id: string }>(filename: string, id: string): T | null {
  const records = readData<T>(filename);
  return records.find(r => r.id === id) || null;
}