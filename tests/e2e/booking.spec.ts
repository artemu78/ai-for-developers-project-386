import { expect, test } from '@playwright/test'

test('guest books a free slot and owner sees the new call', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /Найдём время/ })).toBeVisible()
  await page.getByRole('button', { name: /Знакомство/ }).click()

  const slots = page.locator('.slots button')
  await expect(slots.first()).toBeVisible()
  const selectedTime = await slots.first().innerText()
  await slots.first().click()

  await page.getByLabel('Имя').fill('Тестовый гость')
  await page.getByLabel('Email').fill('guest@example.com')
  await page.getByRole('button', { name: 'Подтвердить запись' }).click()

  await expect(page.getByRole('status')).toContainText('Готово! Звонок назначен')
  await expect(page.getByRole('status')).toContainText(selectedTime)

  await page.getByRole('button', { name: 'Мой календарь' }).click()
  const meeting = page.locator('.meeting').filter({ hasText: 'Тестовый гость' })
  await expect(meeting).toContainText('Знакомство')
  await expect(meeting).toContainText('guest@example.com')
})
