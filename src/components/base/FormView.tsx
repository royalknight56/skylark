/**
 * 多维表格 - 表单视图
 * 将数据表转为表单形式，用于信息收集
 * @author skylark
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import CellEditor from "./CellEditor";
import FieldTypeIcon from "./FieldTypeIcon";
import type { BaseField, BaseRecord, BaseView } from "@/lib/types";

interface FormViewProps {
  fields: BaseField[];
  view: BaseView;
  onAddRecord: (initialData?: Record<string, unknown>) => Promise<void>;
}

export default function FormView({ fields, view, onAddRecord }: FormViewProps) {
  const config = view.config || {};
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /** 表单字段（排除自动字段） */
  const formFields = useMemo(() => {
    return fields.filter(
      (f) => f.type !== "created_at" && f.type !== "updated_at"
    );
  }, [fields]);

  /** 更新字段值 */
  const handleChange = useCallback((fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  /** 提交表单 */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onAddRecord(formData);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  /** 重新填写 */
  const handleReset = () => {
    setFormData({});
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-page">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check size={32} className="text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">提交成功</h3>
        <p className="text-sm text-text-secondary mb-6">您的信息已成功录入</p>
        <button onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
          <RotateCcw size={14} /> 继续填写
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg-page">
      <div className="max-w-2xl mx-auto py-8 px-6">
        {/* 表单标题 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-text-primary">{view.name}</h2>
          <p className="text-sm text-text-secondary mt-1">请填写以下信息</p>
        </div>

        {/* 表单字段 */}
        <div className="space-y-6">
          {formFields.map((field) => {
            const formField = config.form_fields?.find((f) => f.field_id === field.id);

            return (
              <div key={field.id} className="bg-panel-bg rounded-xl border border-panel-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FieldTypeIcon type={field.type} size={15} />
                  <label className="text-sm font-medium text-text-primary">
                    {field.name}
                  </label>
                  {formField?.required && (
                    <span className="text-red-500 text-xs">*</span>
                  )}
                </div>
                {formField?.description && (
                  <p className="text-xs text-text-secondary mb-2">{formField.description}</p>
                )}
                <div className="border border-panel-border rounded-lg overflow-hidden bg-bg-page min-h-9">
                  <CellEditor
                    field={field}
                    value={formData[field.id]}
                    onChange={(val) => handleChange(field.id, val)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 提交按钮 */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl text-sm font-medium
              hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-lg"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            提交
          </button>
        </div>
      </div>
    </div>
  );
}
