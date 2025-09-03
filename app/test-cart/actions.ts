'use server';

import { addItem } from '@/components/cart/actions';

export async function addWine1Action() {
  const result = await addItem('1fc52e4d-a4b9-4c99-b00f-9f5678cd2f61-default');
  console.log('Add item result:', result);
}

export async function addWine2Action() {
  const result = await addItem('0ae0b834-238c-455c-97e2-66def6bba93d-default');
  console.log('Add item result:', result);
}
