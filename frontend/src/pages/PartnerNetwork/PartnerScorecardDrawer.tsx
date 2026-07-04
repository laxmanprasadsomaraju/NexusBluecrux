import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';
import * as partnersApi from '../../api/partners';
import { Drawer } from '../../components/Drawer/Drawer';
import { Button } from '../../components/Button/Button';
import { Spinner } from '../../components/Spinner/Spinner';
import { HorizontalBarList } from '../../components/HorizontalBarList/HorizontalBarList';
import { colors } from '../../lib/tokens';

export function PartnerScorecardDrawer({ partnerId, onClose }: { partnerId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.partnerScorecard(partnerId),
    queryFn: () => partnersApi.getPartnerScorecard(partnerId, 90),
  });

  const trend = data?.trend ?? [];
  const openedBars = trend.slice(-6).map((t) => ({ label: t.period, value: t.opened, displayValue: String(t.opened), color: colors.cyanPrimary }));
  const resolvedBars = trend.slice(-6).map((t) => ({ label: t.period, value: t.resolved, displayValue: String(t.resolved), color: colors.resolved }));

  return (
    <Drawer
      width={380}
      onClose={onClose}
      header={
        data ? (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--black)' }}>{data.partner.name}</div>
            <div style={{ fontSize: 12, color: 'var(--timestamp-gray)', marginTop: 2 }}>{data.partner.type} · {data.days}-day scorecard</div>
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )
      }
    >
      {isLoading || !data ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <Spinner size={20} color="var(--cyan-primary)" />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--black)' }}>{data.avg_response_hours}h</div>
              <div style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>Avg response time</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--black)' }}>{data.total_exceptions}</div>
              <div style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>Exceptions ({data.days}d)</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--resolved)' }}>{data.resolved_exceptions}</div>
              <div style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>Resolved</div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--timestamp-gray)', paddingBottom: 6, borderBottom: '0.5px solid var(--mid-gray)' }}>
            Exceptions opened (weekly)
          </div>
          <div style={{ marginTop: 12, marginBottom: 20 }}>
            <HorizontalBarList data={openedBars.length ? openedBars : [{ label: 'No data', value: 0, displayValue: '0', color: colors.midGray }]} />
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--timestamp-gray)', paddingBottom: 6, borderBottom: '0.5px solid var(--mid-gray)' }}>
            Exceptions resolved (weekly)
          </div>
          <div style={{ marginTop: 12 }}>
            <HorizontalBarList data={resolvedBars.length ? resolvedBars : [{ label: 'No data', value: 0, displayValue: '0', color: colors.midGray }]} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                navigate(`/exceptions?partner=${data.partner.id}&partnerName=${encodeURIComponent(data.partner.name)}`);
              }}
            >
              View this partner's exceptions
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
}
