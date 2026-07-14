import React, { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';

export interface AudienceSubmission {
  postId: string;
  audienceType: 'ORG_WIDE' | 'DEPT_ONLY' | 'CUSTOM';
  customDepartments?: string[];
}

interface AudienceSelectorProps {
  postId: string;
  onSubmit: (submission: AudienceSubmission) => void;
  departments?: Array<{ id: string; name: string }>;
}

const DEFAULT_DEPARTMENTS = [
  { id: 'eng', name: 'Engineering' },
  { id: 'sales', name: 'Sales' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'hr', name: 'Human Resources' },
  { id: 'finance', name: 'Finance' },
];

export function AudienceSelector({
  postId,
  onSubmit,
  departments = DEFAULT_DEPARTMENTS,
}: AudienceSelectorProps) {
  const [audienceType, setAudienceType] = useState<'ORG_WIDE' | 'DEPT_ONLY' | 'CUSTOM'>('ORG_WIDE');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { currentUser } = useAuth();

  const handleDepartmentToggle = useCallback((deptId: string) => {
    setSelectedDepartments((prev) => {
      if (prev.includes(deptId)) {
        return prev.filter((id) => id !== deptId);
      }
      return [...prev, deptId];
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!currentUser) {
      setError('You must be logged in to submit a post');
      return;
    }

    if (audienceType === 'CUSTOM' && selectedDepartments.length === 0) {
      setError('Please select at least one department for custom audience');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem('auth_token');
      const payload = {
        audienceType,
        customDepartments: audienceType === 'CUSTOM' ? selectedDepartments : undefined,
      };

      const response = await fetch(`/api/posts/${postId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error?.message || 'Failed to submit post');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setSuccess(true);
      setIsLoading(false);

      // Call parent callback
      onSubmit({
        postId,
        audienceType,
        customDepartments: audienceType === 'CUSTOM' ? selectedDepartments : undefined,
      });

      // Redirect after success
      setTimeout(() => {
        window.location.href = '/submissions';
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  }, [postId, audienceType, selectedDepartments, currentUser, onSubmit]);

  return (
    <div className="audience-selector">
      <h2>Select Audience</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Successfully submitted for approval!</div>}

      <div className="audience-options">
        {/* Organization Wide */}
        <div className="audience-option">
          <input
            type="radio"
            id="org-wide"
            name="audience"
            value="ORG_WIDE"
            checked={audienceType === 'ORG_WIDE'}
            onChange={() => setAudienceType('ORG_WIDE')}
          />
          <label htmlFor="org-wide">
            <strong>Organization-Wide</strong>
            <p>Post visible to all employees</p>
          </label>
        </div>

        {/* Department Only */}
        <div className="audience-option">
          <input
            type="radio"
            id="dept-only"
            name="audience"
            value="DEPT_ONLY"
            checked={audienceType === 'DEPT_ONLY'}
            onChange={() => setAudienceType('DEPT_ONLY')}
          />
          <label htmlFor="dept-only">
            <strong>Department Only</strong>
            <p>Post visible to your department only</p>
          </label>
        </div>

        {/* Custom Audience */}
        <div className="audience-option">
          <input
            type="radio"
            id="custom"
            name="audience"
            value="CUSTOM"
            checked={audienceType === 'CUSTOM'}
            onChange={() => setAudienceType('CUSTOM')}
          />
          <label htmlFor="custom">
            <strong>Custom Audience</strong>
            <p>Post visible to selected departments</p>
          </label>
        </div>
      </div>

      {/* Custom Departments Selector */}
      {audienceType === 'CUSTOM' && (
        <div className="custom-departments">
          <h3>Select Departments</h3>
          <div className="departments-list">
            {departments.map((dept) => (
              <div key={dept.id} className="department-item">
                <input
                  type="checkbox"
                  id={`dept-${dept.id}`}
                  checked={selectedDepartments.includes(dept.id)}
                  onChange={() => handleDepartmentToggle(dept.id)}
                />
                <label htmlFor={`dept-${dept.id}`}>{dept.name}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="submit-section">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="submit-button"
        >
          {isLoading ? 'Submitting...' : 'Submit for Approval'}
        </button>
      </div>
    </div>
  );
}
