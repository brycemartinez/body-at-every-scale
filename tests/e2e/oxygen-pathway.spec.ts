import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** The oxygen pathway, body → hemoglobin: one hotspot per level. */
const PATH = [
  { hotspot: 'Cardiovascular system', hash: '#/cardiovascular' },
  { hotspot: 'Blood', hash: '#/cardiovascular/blood' },
  { hotspot: 'Blood as tissue', hash: '#/cardiovascular/blood/blood-tissue' },
  { hotspot: 'Red blood cell', hash: '#/cardiovascular/blood/blood-tissue/rbc' },
  { hotspot: 'Membrane & cytoskeleton', hash: '#/cardiovascular/blood/blood-tissue/rbc/rbc-membrane' },
  { hotspot: 'Hemoglobin', hash: '#/cardiovascular/blood/blood-tissue/rbc/rbc-membrane/hemoglobin' },
];
const TITLES = ['Human body', ...PATH.map((p) => p.hotspot)];

const heading = (page: Page) => page.getByRole('heading', { level: 1 });
const hotspot = (page: Page, title: string) => page.getByRole('button', { name: `Zoom into ${title}`, exact: true });

async function expectAt(page: Page, index: number) {
  await expect(heading(page)).toHaveText(TITLES[index]);
  await expect(page).toHaveURL(new RegExp(`${index === 0 ? '#?/?' : PATH[index - 1].hash.replace(/[/&]/g, '\\$&')}$`));
}

test('clicks from the body to hemoglobin in 6 clicks, then back up every level', async ({ page }) => {
  await page.goto('./');
  await expectAt(page, 0);

  for (const [i, step] of PATH.entries()) {
    const target = hotspot(page, step.hotspot);
    if (test.info().project.name === 'mobile') await target.tap();
    else await target.click();
    await expectAt(page, i + 1);
  }
  await expect(page.getByText('You’ve reached the molecular level')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('listitem')).toHaveText([
    'Body',
    'Cardiovascular',
    'Blood',
    'Blood as tissue',
    'Red blood cell',
    'Membrane & cytoskeleton',
    'Hemoglobin',
  ]);

  for (let i = PATH.length; i > 0; i--) {
    await page.getByRole('button', { name: `Back to ${TITLES[i - 1]}` }).click();
    await expectAt(page, i - 1);
  }
  await expect(page.getByRole('button', { name: /^Back to/ })).toHaveCount(0);
});

test('keyboard: Tab + Enter goes all the way down, Escape comes all the way back', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'keyboard flow is a desktop concern');
  await page.goto('./');
  await expectAt(page, 0);

  for (const [i, step] of PATH.entries()) {
    // After each zoom, focus sits on the scene, so the next Tabs walk its hotspots in order.
    const target = hotspot(page, step.hotspot);
    for (let tabs = 0; tabs < 4 && !(await target.evaluate((el) => el === document.activeElement)); tabs++) {
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveClass(/hotspot/);
    }
    await expect(target).toBeFocused();
    await page.keyboard.press('Enter');
    await expectAt(page, i + 1);
  }
  for (let i = PATH.length; i > 0; i--) {
    await page.keyboard.press('Escape');
    await expectAt(page, i - 1);
  }
});

test('browser back returns one level', async ({ page }) => {
  await page.goto('./');
  await hotspot(page, 'Cardiovascular system').click();
  await expectAt(page, 1);
  await hotspot(page, 'Blood').click();
  await expectAt(page, 2);
  await page.goBack();
  await expectAt(page, 1);
  await page.goBack();
  await expectAt(page, 0);
});

test('deep links open the right node, and shortened links redirect to the full path', async ({ page }) => {
  await page.goto('./#/cardiovascular/blood/rbc');
  await expectAt(page, 4);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Red blood cell');
});

test('flies into hotspots with normal motion', async ({ page }) => {
  await page.goto('./');
  const start = Date.now();
  await hotspot(page, 'Cardiovascular system').click();
  // The fly-through keeps the body scene up for ~750 ms before crossing.
  await expect(heading(page)).toHaveText('Human body');
  await expectAt(page, 1);
  expect(Date.now() - start).toBeGreaterThanOrEqual(600);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('cuts straight to the child instead of flying', async ({ page }) => {
    await page.goto('./');
    const transforms: string[] = [];
    await page.exposeFunction('recordTransform', (t: string) => transforms.push(t));
    await page.evaluate(() => {
      const el = document.querySelector('.scene-transform')!;
      new MutationObserver(() => (window as unknown as { recordTransform(t: string): void }).recordTransform(
        (el as HTMLElement).style.transform,
      )).observe(el, { attributes: true });
    });
    const start = Date.now();
    await hotspot(page, 'Cardiovascular system').click();
    await expectAt(page, 1);
    expect(Date.now() - start).toBeLessThan(500);
    // The body scene was never scaled toward the hotspot.
    expect(transforms.filter((t) => !/scale\(1\)$/.test(t))).toEqual([]);
  });
});

test('has no serious or critical axe violations on the body and molecule pages', async ({ page }) => {
  for (const url of ['./', './#/cardiovascular/blood/blood-tissue/rbc/rbc-membrane/hemoglobin']) {
    await page.goto(url);
    await expect(heading(page)).toBeVisible();
    await page.waitForTimeout(500); // let the entrance fade finish
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
  }
});
