import { expect, test, type Page } from '@playwright/test';

/** Fails the test on any console error or uncaught exception (hydration mismatches included). */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test.describe('home page', () => {
  test('renders the hero, metadata and structured data without errors', async ({ page }) => {
    const errors = watchErrors(page);
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Small group plans in Kota for verified adults');
    await expect(page).toHaveTitle(/Hengout: small group plans in Kota/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /3 to 10/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://hengout.app/');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /opengraph-image/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-IN');

    // One h1; only structured data that is true today (no app rating or store listing exists yet).
    await expect(page.locator('h1')).toHaveCount(1);
    const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}');
    expect(graph['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['Organization', 'WebSite']);
    expect(await page.locator('.faq__item summary h3').count()).toBeGreaterThanOrEqual(10);

    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('every in-page link lands on a section that exists', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('a[href^="#"], a[href^="/#"]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of new Set(hrefs)) {
      const id = href.split('#')[1];
      await expect(page.locator(`[id="${id}"]`), `target of ${href}`).toHaveCount(1);
    }
  });

  test('every image loads and has alt text', async ({ page }) => {
    await page.goto('/');
    // Scroll through so lazy images load.
    for (let y = 0; y < 12000; y += 700) await page.mouse.wheel(0, 700);
    await page.waitForLoadState('networkidle');
    const broken = await page.locator('img').evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    );
    expect(broken).toEqual([]);
    expect(await page.locator('img:not([alt])').count()).toBe(0);
  });

  test('FAQ answers are in the HTML and open on click', async ({ page }) => {
    await page.goto('/');
    const item = page.locator('.faq__item').filter({ hasText: 'Does Hengout track my location?' });
    await expect(item.locator('p')).toHaveText(/150 metres/); // crawlable even while closed
    await expect(item.locator('p')).toBeHidden();
    await item.locator('summary').click();
    await expect(item.locator('p')).toBeVisible();
  });

  test('under reduced motion the statement is shown at full ink', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#groups').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const dim = await page.locator('#groups .statement, #groups .statement *').evaluateAll((els) => els.filter((e) => getComputedStyle(e).opacity !== '1').length);
    expect(dim).toBe(0);
  });
});

test.describe('navigation', () => {
  test('the phone menu opens, says its state and closes on Escape', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the menu button only shows below 900px');
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Open menu' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#nav-links').getByRole('link', { name: 'Safety' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  test('the skip link is the first thing Tab reaches', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard check on desktop');
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText('Skip to content');
  });
});

test.describe('contact', () => {
  test('the main action opens an email to the team', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('footer').getByRole('link', { name: 'Email the team' });
    await expect(link).toHaveAttribute('href', /^mailto:/);
    expect(await page.locator('form').count()).toBe(0);
  });
});

test.describe('other routes', () => {
  test('community guidelines has its own canonical and breadcrumbs', async ({ page }) => {
    const res = await page.goto('/community-guidelines/');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hengout community guidelines');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://hengout.app/community-guidelines/');
    const crumbs = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}');
    expect(crumbs['@type']).toBe('BreadcrumbList');
  });

  test('an unknown address answers 404 and is not indexed', async ({ page }) => {
    const res = await page.goto('/no-such-page/');
    expect(res?.status()).toBe(404);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('robots.txt and sitemap.xml list the canonical pages', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Sitemap: https://hengout.app/sitemap.xml');
    expect(robots).not.toMatch(/Disallow: \/\s*$/m);
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('<loc>https://hengout.app/</loc>');
    expect(sitemap).toContain('<loc>https://hengout.app/community-guidelines/</loc>');
  });
});
