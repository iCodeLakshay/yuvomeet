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

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Real people\. Real plans\.\s*Skip the swiping\./);
    await expect(page).toHaveTitle('Hengout — Real people. Real plans. Skip the swiping.');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /verified community/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://hengout.app/');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /opengraph-image/);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /\/icon/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-IN');
    for (const h of ['The data behind real connection', 'Why people choose Hengout', 'How Hengout works in 3 steps', 'Ready to reclaim your offline life?']) {
      await expect(page.getByRole('heading', { level: 2, name: h })).toBeVisible();
    }
    const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}');
    expect(graph['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['Organization', 'WebSite']);

    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('says Hengout, never the old name', async ({ page }) => {
    for (const path of ['/', '/legal/', '/community-guidelines/']) {
      await page.goto(path);
      expect(await page.locator('body').innerText()).not.toMatch(/yuvomeet/i);
    }
  });

  test('the logo is the only image, and it loads in the header and the footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const imgs = page.locator('img');
    expect(await imgs.count()).toBe(2);
    for (const where of ['header', 'footer']) {
      const logo = page.locator(where).locator('img');
      await expect(logo).toHaveAttribute('src', '/hengout.png');
      await expect(logo).toHaveAttribute('alt', 'Hengout');
      expect(await logo.evaluate((el) => (el as HTMLImageElement).naturalWidth), `${where} logo loaded`).toBeGreaterThan(0);
    }
  });

  test('sections have clear room between them', async ({ page, isMobile }) => {
    await page.goto('/');
    const ids = ['reality-of-connection', 'features', 'how-it-works'];
    const boxes = await Promise.all(ids.map((id) => page.locator(`#${id}`).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, bottom: r.bottom + scrollY };
    })));
    const min = isMobile ? 120 : 200;
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i]!.top - boxes[i - 1]!.bottom, `gap before #${ids[i]}`).toBeGreaterThanOrEqual(min);
    }
  });

  test('every in-page link lands on a section that exists', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('a[href^="#"], a[href^="/#"]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    const targets = [...new Set(hrefs)];
    expect(targets.length).toBeGreaterThanOrEqual(3);
    for (const href of targets) {
      const id = href.split('#')[1];
      expect(id, `${href} has a target`).toBeTruthy();
      await expect(page.locator(`[id="${id}"]`), `target of ${href}`).toHaveCount(1);
    }
  });

  test('does not scroll sideways', async ({ page }) => {
    await page.goto('/');
    const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(scroll).toBeLessThanOrEqual(client);
  });

  test('both waitlist forms reserve a spot, as in the design', async ({ page }) => {
    await page.goto('/');
    for (const [input, button, message] of [
      ['#studentContactMain', '#joinBtnMain', '#successMsgMain'],
      ['#studentContactBottom', '#joinBtnBottom', '#successMsgBottom'],
    ] as const) {
      await page.locator(input).fill('me@example.com');
      await page.locator(button).click();
      await expect(page.locator(button)).toHaveText(/Priority Reserved/);
      await expect(page.locator(button)).toBeDisabled();
      await expect(page.locator(message)).toBeVisible();
    }
  });
});

test.describe('layout', () => {
  test('the hero button is only as wide as its label', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('#joinBtnMain');
    const [b, form] = await Promise.all([btn.boundingBox(), btn.evaluate((e) => e.closest('form')!.getBoundingClientRect().width)]);
    expect(b!.width).toBeLessThan(form * 0.8);
  });

  for (const [id, name] of [['reality-of-connection', 'the data cards'], ['features', 'the reasons cards']] as const) {
    test(`${name} are 2 x 2 on phones and 4 across on desktop`, async ({ page, isMobile }) => {
      await page.goto('/');
      const boxes = await page.locator(`#${id} [data-reveal] > .glass-card`).evaluateAll((els) =>
        els.map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + scrollY) }; }),
      );
      expect(boxes).toHaveLength(4);
      const rows = new Set(boxes.map((b) => b.y));
      const cols = new Set(boxes.map((b) => b.x));
      if (isMobile) {
        expect(rows.size, 'two rows').toBe(2);
        expect(cols.size, 'two columns').toBe(2);
      } else {
        expect(rows.size, 'one row').toBe(1);
        expect(cols.size, 'four columns').toBe(4);
      }
    });
  }

  test('how it works swipes as a carousel on phones and is a 3-column grid on desktop', async ({ page, isMobile }) => {
    await page.goto('/');
    const track = page.locator('#steps-track');
    const dots = page.getByRole('group', { name: /How Hengout works, step navigation/ });
    const { scroll, client } = await track.evaluate((e) => ({ scroll: e.scrollWidth, client: e.clientWidth }));
    if (isMobile) {
      expect(scroll).toBeGreaterThan(client + 100);
      await dots.scrollIntoViewIfNeeded();
      await dots.getByRole('button', { name: 'How Hengout works, step 3 of 3' }).click();
      await expect(dots.getByRole('button', { name: 'How Hengout works, step 3 of 3' })).toHaveAttribute('aria-current', 'true', { timeout: 5000 });
      expect(await track.evaluate((e) => e.scrollLeft)).toBeGreaterThan(100);
      const ys = await track.locator('> .glass-card').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      expect(new Set(ys).size, 'cards sit side by side').toBe(1);
    } else {
      expect(scroll).toBeLessThanOrEqual(client + 1);
      await expect(dots).toBeHidden();
    }
  });

  test('the CTA has its words beside the form on desktop and above it on phones, form stacked, smoke on the form side', async ({ page, isMobile }) => {
    await page.goto('/');
    const zone = page.locator('[data-smoke-zone]');
    await zone.scrollIntoViewIfNeeded();
    const q = (sel: string) => zone.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });
    const [panel, h2, input, button, smoke] = await Promise.all([
      zone.evaluate((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }),
      q('h2'),
      q('#studentContactBottom'),
      q('#joinBtnBottom'),
      zone.locator('[data-smoke-pointer]').first().evaluate((e) => { const r = e.parentElement!.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; }),
    ]);
    expect(button.t, 'button below the input').toBeGreaterThanOrEqual(input.b - 1);
    expect(button.r - button.l, 'button is not full width').toBeLessThan((input.r - input.l) * 0.8);
    if (isMobile) {
      expect(input.t, 'form below the words').toBeGreaterThan(h2.b);
      expect(smoke.t, 'smoke in the lower part').toBeGreaterThan(panel.t + (panel.b - panel.t) * 0.3);
    } else {
      expect(h2.r, 'words left of the form').toBeLessThan(input.l);
      expect(smoke.l, 'smoke only on the right').toBeGreaterThan(panel.l + (panel.r - panel.l) * 0.3);
    }
  });

  test('the CTA smoke follows the mouse a little', async ({ page, isMobile }) => {
    test.skip(isMobile, 'a mouse effect');
    await page.goto('/');
    const zone = page.locator('[data-smoke-zone]');
    await zone.scrollIntoViewIfNeeded();
    const layer = zone.locator('[data-smoke-pointer]').first();
    const box = (await zone.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
    await expect.poll(() => layer.evaluate((e) => (e as HTMLElement).style.transform), { timeout: 5000 }).not.toBe('');
    const first = await layer.evaluate((e) => (e as HTMLElement).style.transform);
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.8, { steps: 6 });
    await expect.poll(() => layer.evaluate((e) => (e as HTMLElement).style.transform), { timeout: 5000 }).not.toBe(first);
  });
});

test.describe('motion', () => {
  test('cards and graphics finish in view once scrolled to', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('#features [data-reveal] > .glass-card').first();
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).opacity), { timeout: 4000 }).toBe('1');
  });

  test('under reduced motion nothing is hidden or moving', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    const hidden = await page.locator('[data-reveal] > .glass-card, [data-bar], [data-line], h1').evaluateAll((els) =>
      els.filter((e) => getComputedStyle(e).opacity !== '1' || getComputedStyle(e).visibility === 'hidden').length,
    );
    expect(hidden).toBe(0);
    const moved = await page.locator('[data-aura], [data-float], [data-magnetic], [data-smoke]').evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).style.transform).length,
    );
    expect(moved).toBe(0);
  });
});

test.describe('navigation', () => {
  test('the header keeps its waitlist action on every width', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header').getByRole('link', { name: /Join Waitlist/ })).toBeVisible();
  });

  test('the skip link is the first thing Tab reaches', async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard check on desktop');
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText('Skip to content');
  });

  test('the footer links to the legal page, email and Instagram', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/legal/#privacy');
    await expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/legal/#terms');
    await expect(footer.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', /^mailto:/);
    const ig = footer.getByRole('link', { name: 'Hengout on Instagram' });
    await expect(ig).toHaveAttribute('href', 'https://www.instagram.com/next.gengroa/');
    await expect(ig).toHaveAttribute('rel', /noopener/);
    expect(await footer.locator('a[href="#"]').count()).toBe(0);
  });
});

test.describe('other routes', () => {
  test('the legal page has terms, privacy and a grievance contact', async ({ page }) => {
    const errors = watchErrors(page);
    const res = await page.goto('/legal/');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Terms & Privacy');
    await expect(page.locator('#terms')).toContainText('18 or older');
    await expect(page.locator('#privacy')).toContainText('Digital Personal Data Protection Act');
    await expect(page.locator('#grievance a[href^="mailto:"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://hengout.app/legal/');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

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
    for (const p of ['/', '/community-guidelines/', '/legal/']) expect(sitemap).toContain(`<loc>https://hengout.app${p}</loc>`);
  });
});
