import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';
import * as partnersApi from '../../api/partners';
import { Table, Th, Td, Tr } from '../../components/Table/Table';
import { Badge } from '../../components/Badge/Badge';
import { Spinner } from '../../components/Spinner/Spinner';
import { getSeverityStyle } from '../../lib/severity';
import { getPartnerStatusBadge } from '../../lib/statusBadges';
import { responseTimeColor } from '../../lib/tokens';
import { PartnerScorecardDrawer } from './PartnerScorecardDrawer';

export function PartnerNetwork() {
  const navigate = useNavigate();
  const [scorecardId, setScorecardId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: queryKeys.partners(), queryFn: partnersApi.listPartners });

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      <Table>
        <thead>
          <tr>
            <Th>Partner name</Th>
            <Th>Type</Th>
            <Th>Open exceptions</Th>
            <Th>Avg response time</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((p, i) => {
            const sevStyle = p.open_top_severity ? getSeverityStyle(p.open_top_severity) : null;
            const statusStyle = getPartnerStatusBadge(p.status);
            return (
              <Tr key={p.id} index={i} onClick={() => navigate(`/exceptions?partner=${p.id}&partnerName=${encodeURIComponent(p.name)}`)}>
                <Td>
                  <span
                    style={{ fontSize: 12, fontWeight: 500, color: 'var(--black)', cursor: 'pointer', borderBottom: '1px dotted var(--mid-gray)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setScorecardId(p.id);
                    }}
                  >
                    {p.name}
                  </span>
                </Td>
                <Td>
                  <Badge bg="var(--light-gray)" text="var(--dark-gray)" style={{ border: '0.5px solid var(--mid-gray)' }}>
                    {p.type}
                  </Badge>
                </Td>
                <Td>
                  <span style={{ fontSize: 12, fontWeight: 500, color: sevStyle?.dot || 'var(--dark-gray)' }}>{p.open_summary}</span>
                </Td>
                <Td>
                  <span style={{ fontSize: 12, fontWeight: 500, color: responseTimeColor(p.avg_response_hours) }}>{p.avg_response_hours}h</span>
                </Td>
                <Td>
                  <Badge bg={statusStyle.bg} text={statusStyle.text}>
                    {statusStyle.label}
                  </Badge>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      <div style={{ fontSize: 11, color: 'var(--timestamp-gray)', marginTop: 10 }}>
        Click a partner row to filter the exception queue. Click a partner's name for their 90-day scorecard.
      </div>

      {scorecardId && <PartnerScorecardDrawer partnerId={scorecardId} onClose={() => setScorecardId(null)} />}
    </div>
  );
}
