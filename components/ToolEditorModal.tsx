/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useState } from 'react';
import { FunctionCall } from '../lib/state';
import Modal from './Modal';
import { FunctionResponseScheduling } from '@google/genai';
import type { User } from '@supabase/supabase-js';

type ToolEditorModalProps = {
  tool: FunctionCall;
  user: User | null;
  onClose: () => void;
  onSave: (updatedTool: FunctionCall) => void;
};

interface FormProperty {
  id: string;
  name: string;
  type: string;
  description: string;
}

export default function ToolEditorModal({
  tool,
  user,
  onClose,
  onSave,
}: ToolEditorModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scheduling, setScheduling] = useState<FunctionResponseScheduling>(
    FunctionResponseScheduling.INTERRUPT,
  );
  const [properties, setProperties] = useState<FormProperty[]>([]);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const isAdmin = user?.email === 'masterdee@aiteksoftware.site';

  useEffect(() => {
    if (tool) {
      setName(tool.name);
      setDescription(tool.description || '');
      setScheduling(tool.scheduling || FunctionResponseScheduling.INTERRUPT);

      if (
        tool.parameters?.type === 'OBJECT' &&
        tool.parameters.properties
      ) {
        const parsedProps = Object.entries(tool.parameters.properties).map(
          ([propName, schema]: [string, any]) => ({
            id: crypto.randomUUID(),
            name: propName,
            type: schema.type || 'STRING',
            description: schema.description || '',
          }),
        );
        setProperties(parsedProps);
        setRequiredFields(tool.parameters.required || []);
      } else {
        setProperties([]);
        setRequiredFields([]);
      }
    }
  }, [tool]);

  const handlePropertyChange = (
    index: number,
    field: keyof FormProperty,
    value: string,
  ) => {
    const newProperties = [...properties];
    const oldName = newProperties[index].name;
    newProperties[index] = { ...newProperties[index], [field]: value };
    
    // If the name changed, update it in the requiredFields array as well
    if (field === 'name' && requiredFields.includes(oldName)) {
        setRequiredFields(prev => prev.map(name => name === oldName ? value : name));
    }

    setProperties(newProperties);
  };

  const handleRequiredChange = (propName: string, isChecked: boolean) => {
    if (isChecked) {
      setRequiredFields(prev => [...prev, propName]);
    } else {
      setRequiredFields(prev => prev.filter(name => name !== propName));
    }
  };

  const handleAddProperty = () => {
    setProperties([
      ...properties,
      {
        id: crypto.randomUUID(),
        name: `new_param_${properties.length + 1}`,
        type: 'STRING',
        description: '',
      },
    ]);
  };

  const handleRemoveProperty = (id: string) => {
    const propToRemove = properties.find(p => p.id === id);
    if (propToRemove) {
      handleRequiredChange(propToRemove.name, false);
    }
    setProperties(properties.filter(prop => prop.id !== id));
  };

  const handleSave = () => {
    const newProperties = properties.reduce(
      (acc, prop) => {
        if (prop.name) {
          const schema: any = {
            type: prop.type,
            description: prop.description,
          };
          // For now, assume arrays hold strings, as per existing examples
          if (prop.type === 'ARRAY') {
            schema.items = { type: 'STRING' };
          }
          acc[prop.name] = schema;
        }
        return acc;
      },
      {} as Record<string, any>,
    );

    const validRequiredFields = requiredFields.filter(
      fieldName => !!newProperties[fieldName],
    );

    const parameters =
      Object.keys(newProperties).length > 0
        ? {
          type: 'OBJECT',
          properties: newProperties,
          required: validRequiredFields,
        }
        : {};

    onSave({
      ...tool,
      name,
      description,
      parameters,
      scheduling,
    });
  };

  return (
    <Modal onClose={onClose}>
      <div className="tool-editor-modal">
        <h2>Edit Function Call</h2>
        <div className="form-field">
          <label htmlFor="tool-name">Name</label>
          <input
            id="tool-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            readOnly={!isAdmin}
          />
        </div>
        <div className="form-field">
          <label htmlFor="tool-description">Description</label>
          <textarea
            id="tool-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            readOnly={!isAdmin}
          />
        </div>
        <div className="form-field">
          <label htmlFor="tool-scheduling">Scheduling Behavior</label>
          <select
            id="tool-scheduling"
            value={scheduling}
            onChange={e =>
              setScheduling(e.target.value as FunctionResponseScheduling)
            }
            disabled={!isAdmin}
          >
            <option value={FunctionResponseScheduling.INTERRUPT}>
              Interrupt
            </option>
            <option value={FunctionResponseScheduling.WHEN_IDLE}>
              When Idle
            </option>
            <option value={FunctionResponseScheduling.SILENT}>Silent</option>
          </select>
          <p className="scheduling-description">
            Determines when the model's response is spoken. 'Interrupt' speaks
            immediately.
          </p>
        </div>

        <div className="parameters-section">
          <div className="parameters-section-header">
            <h3 className="parameters-title">Parameters</h3>
            {isAdmin && (
              <button onClick={handleAddProperty} className="add-property-button" title="Add a new parameter">
                <span className="icon">add</span> Add Parameter
              </button>
            )}
          </div>
          {properties.length > 0 ? (
            <div className="parameters-list">
              {properties.map((prop, index) => (
                <div key={prop.id} className="parameter-item">
                  <div className="parameter-item-header">
                    <input
                      type="text"
                      className="parameter-name-input"
                      aria-label="Parameter name"
                      value={prop.name}
                      readOnly={!isAdmin}
                      onChange={e =>
                        handlePropertyChange(index, 'name', e.target.value)
                      }
                    />
                    {isAdmin && (
                      <div className="parameter-item-controls">
                        <label className="required-toggle-label">
                          Required
                          <div className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={requiredFields.includes(prop.name)}
                              onChange={e => handleRequiredChange(prop.name, e.target.checked)}
                              disabled={!prop.name}
                            />
                            <span className="slider"></span>
                          </div>
                        </label>
                        <button
                          onClick={() => handleRemoveProperty(prop.id)}
                          className="remove-prop-button"
                          aria-label="Remove parameter"
                          title="Remove this parameter"
                        >
                          <span className="icon">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="form-field">
                    <label htmlFor={`prop-desc-${prop.id}`}>Description</label>
                    <textarea
                      id={`prop-desc-${prop.id}`}
                      placeholder="Enter parameter description..."
                      aria-label="Parameter description"
                      value={prop.description}
                      onChange={e =>
                        handlePropertyChange(index, 'description', e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-parameters-message">
              This tool has no parameters.
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-button" title="Discard changes">
            Cancel
          </button>
          <button onClick={handleSave} className="save-button" title="Save tool configuration">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}