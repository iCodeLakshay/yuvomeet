import { ActionForm } from '@/components/ActionForm';
import { Badge, Card, Empty, LoadError, Page, Pager, SearchInput, Toolbar } from '@/components/ui';
import { requireFullAdmin } from '@/lib/auth';
import { paging, searchTerm } from '@/lib/format';
import { deleteScreenTerm, saveScreenTerm } from '../../manage-actions';
import { SettingsTabs } from '../tabs';

function TermFields({ term, lang, action }: { term?: string; lang?: string; action?: string }) {
  return (
    <div className="formgrid">
      {term ? (
        <>
          <input type="hidden" name="term" value={term} />
          <input type="hidden" name="lang" value={lang} />
        </>
      ) : (
        <>
          <label className="field">
            <span>Word or phrase</span>
            <input name="term" required minLength={2} maxLength={60} autoComplete="off" />
            <small>Matched without case.</small>
          </label>
          <label className="field">
            <span>Language</span>
            <input name="lang" defaultValue="en" required list="langs" maxLength={12} />
            <datalist id="langs">
              <option value="en" />
              <option value="hi" />
              <option value="hinglish" />
            </datalist>
          </label>
        </>
      )}
      <label className="field">
        <span>What happens</span>
        <select name="action" defaultValue={action ?? 'hold'}>
          <option value="hold">Hold for review</option>
          <option value="reject">Block outright</option>
        </select>
      </label>
    </div>
  );
}

/** The word list chat messages and bios are screened against (private.screen_terms). */
export default async function Filters({ searchParams }: { searchParams: Promise<{ q?: string; lang?: string; page?: string; size?: string }> }) {
  const { supabase } = await requireFullAdmin();
  const sp = await searchParams;
  const term = searchTerm(sp.q);
  const lang = searchTerm(sp.lang);
  const { page, size, from, to } = paging(sp.page, sp.size);
  let q = supabase.from('admin_screen_terms').select('term, lang, action', { count: 'exact' }).order('lang').order('term').range(from, to);
  if (term) q = q.ilike('term', `%${term}%`);
  if (lang) q = q.eq('lang', lang);
  const { data: terms, count, error } = await q;

  return (
    <Page
      title="Content filter"
      icon="shield"
      crumbs={[{ href: '/settings', label: 'App settings' }]}
      subtitle="Chat messages and bios containing these terms are held for review or blocked before anyone sees them."
      actions={
        <ActionForm dialog={{ label: 'Add term', icon: 'plus', tone: 'primary' }} action={saveScreenTerm} buttons={[{ label: 'Add term', tone: 'primary', icon: 'plus' }]}>
          <TermFields />
        </ActionForm>
      }
    >
      <SettingsTabs current="filters" />
      <Toolbar>
        <SearchInput defaultValue={term} placeholder="Search terms" />
        <input name="lang" defaultValue={lang} placeholder="Language" aria-label="Language" />
      </Toolbar>
      <LoadError error={error} />
      <Card flush>
        {terms?.length ? (
          <table>
            <thead>
              <tr>
                <th>Term</th>
                <th>Language</th>
                <th>Action</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {terms.map((t) => (
                <tr key={`${t.term}|${t.lang}`}>
                  <td>
                    <code>{t.term}</code>
                  </td>
                  <td>
                    <span className="chip">{t.lang}</span>
                  </td>
                  <td>
                    <Badge value={t.action === 'reject' ? 'block' : 'hold'} tone={t.action === 'reject' ? 'danger' : 'warning'} />
                  </td>
                  <td className="actions">
                    <div className="row">
                      <ActionForm dialog={{ label: '', icon: 'edit', compact: true, title: `Edit “${t.term}”` }} action={saveScreenTerm} buttons={[{ label: 'Save', tone: 'primary', icon: 'save' }]}>
                        <TermFields term={t.term ?? ''} lang={t.lang ?? ''} action={t.action ?? 'hold'} />
                      </ActionForm>
                      <ActionForm
                        dialog={{ label: '', icon: 'trash', tone: 'danger', compact: true, title: `Delete “${t.term}”` }}
                        action={deleteScreenTerm}
                        hidden={{ term: t.term ?? '', lang: t.lang ?? '' }}
                        buttons={[{ label: 'Delete', tone: 'danger', icon: 'trash' }]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty icon="shield">No terms match.</Empty>
        )}
      </Card>
      <Pager base="/settings/filters" params={{ q: term || undefined, lang: lang || undefined }} page={page} total={count} size={size} />
    </Page>
  );
}
