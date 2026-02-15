/**
 * Horizontal approval chain progress indicator for MUI DataGrid cells.
 * Shows each step as a circle with role abbreviation, connected by lines.
 */
import React from 'react';
import { LeaveStatus, LeaveType } from '@/types/enums';
import type { LeaveRequest } from '@/types/models';

type StepState = 'done' | 'active' | 'upcoming';

interface ChainStep {
  label: string;
  short: string;
  state: StepState;
}

export function getApprovalChain(req: LeaveRequest): ChainStep[] {
  const { status, leave_type: type, emergency_number: eNum } = req;

  // Emergency #1: auto-approved
  if (type === LeaveType.Emergency && eNum === 1) {
    return [
      { label: 'Employee', short: 'E', state: 'done' },
      { label: 'Auto', short: '✓', state: 'done' },
    ];
  }

  // Define chain steps based on type and current status
  interface PendingStep { label: string; short: string; pending: LeaveStatus }
  let chainSteps: PendingStep[];

  if (type === LeaveType.Emergency) {
    chainSteps = eNum === 2
      ? [{ label: 'Manager', short: 'M', pending: LeaveStatus.PendingManager }]
      : [
          { label: 'Manager', short: 'M', pending: LeaveStatus.PendingManager },
          { label: 'HR Dir', short: 'HD', pending: LeaveStatus.PendingHRDirector },
        ];
  } else if (status === LeaveStatus.PendingHRDirector) {
    // HR employee's own PTO — only needs HR Director
    chainSteps = [{ label: 'HR Dir', short: 'HD', pending: LeaveStatus.PendingHRDirector }];
  } else {
    // Standard PTO chain
    chainSteps = [
      { label: 'Supervisor', short: 'S', pending: LeaveStatus.PendingSupervisor },
      { label: 'Manager', short: 'M', pending: LeaveStatus.PendingManager },
      { label: 'HR', short: 'HR', pending: LeaveStatus.PendingHR },
    ];
  }

  const steps: ChainStep[] = [{ label: 'Employee', short: 'E', state: 'done' }];
  const activeIdx = chainSteps.findIndex((s) => s.pending === status);
  const isTerminal = [LeaveStatus.Approved, LeaveStatus.Rejected, LeaveStatus.Cancelled].includes(status);

  chainSteps.forEach((step, i) => {
    let state: StepState;
    if (isTerminal) {
      state = 'done';
    } else if (activeIdx === -1) {
      // Current status not in defined chain (skipped steps) — treat all as done
      state = 'done';
    } else if (i < activeIdx) {
      state = 'done';
    } else if (i === activeIdx) {
      state = 'active';
    } else {
      state = 'upcoming';
    }
    steps.push({ label: step.label, short: step.short, state });
  });

  return steps;
}

const CIRCLE: Record<StepState, React.CSSProperties> = {
  done: { backgroundColor: '#16A34A', color: '#FFFFFF', border: '2px solid #16A34A' },
  active: { backgroundColor: '#F59E0B', color: '#FFFFFF', border: '2px solid #F59E0B' },
  upcoming: { backgroundColor: 'transparent', color: '#94A3B8', border: '2px dashed #94A3B8' },
};

const LABEL_COLOR: Record<StepState, string> = {
  done: '#16A34A',
  active: '#F59E0B',
  upcoming: '#94A3B8',
};

function getLineStyle(leftState: StepState, rightState: StepState): React.CSSProperties {
  if (leftState === 'done' && rightState === 'done') {
    return { borderTop: '2px solid #16A34A' };
  }
  if (leftState === 'done' && rightState === 'active') {
    return { borderTop: '2px solid #F59E0B' };
  }
  return { borderTop: '2px dashed #CBD5E1' };
}

export function ApprovalChainCell({ request }: { request: LeaveRequest }) {
  const steps = getApprovalChain(request);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        width: '100%',
        padding: '6px 0',
      }}
    >
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const circleStyle = CIRCLE[step.state];

        return (
          <React.Fragment key={i}>
            {/* Step */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 34 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: step.short.length > 2 ? 9 : 11,
                  fontWeight: 700,
                  letterSpacing: '-0.3px',
                  flexShrink: 0,
                  ...circleStyle,
                }}
              >
                {step.short}
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  marginTop: 3,
                  color: LABEL_COLOR[step.state],
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connecting line */}
            {!isLast && (
              <div
                style={{
                  width: 18,
                  marginTop: 14,
                  marginLeft: -1,
                  marginRight: -1,
                  flexShrink: 0,
                  ...getLineStyle(step.state, steps[i + 1].state),
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
