'use client'

import { useFormContext } from 'react-hook-form'
import type { NewListingForm } from './schema'
import { Field, inputCls, RadioGroup, Toggle } from './formPrimitives'
import { StepNav } from './StepNav'

interface Step3Props {
  onBack: () => void
  onNext: () => void
}

export function Step3TypeFields({ onBack, onNext }: Step3Props) {
  const { watch, setValue } = useFormContext<NewListingForm>()
  const type = watch('type')
  const tf = (watch('typeFields') as Record<string, unknown>) || {}

  // Generic helper — write a single key into typeFields without trampling siblings
  const set = (key: string, val: unknown) => {
    setValue('typeFields' as 'typeFields', { ...tf, [key]: val }, { shouldDirty: true })
  }

  return (
    <div className="px-6 py-8 max-w-[760px] mx-auto">
      <h1 className="text-[28px] font-extrabold text-dark tracking-tight mb-2">
        {type === 'hostel' && 'Hostel details'}
        {type === 'room' && 'Room / Flat details'}
        {type === 'office' && 'Office details'}
        {type === 'business' && 'Business space details'}
      </h1>
      <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
        These fields help tenants filter and find the right kind of space.
      </p>

      <div className="space-y-5">
        {type === 'hostel' && <HostelFieldsView tf={tf} set={set} />}
        {type === 'room' && <RoomFieldsView tf={tf} set={set} />}
        {type === 'office' && <OfficeFieldsView tf={tf} set={set} />}
        {type === 'business' && <BusinessFieldsView tf={tf} set={set} />}
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Per-type field views                                                       */
/* -------------------------------------------------------------------------- */

interface ViewProps {
  tf: Record<string, unknown>
  set: (key: string, val: unknown) => void
}

function HostelFieldsView({ tf, set }: ViewProps) {
  return (
    <>
      <Field label="Gender" required>
        <RadioGroup
          options={[
            { value: 'boys', label: 'Boys Only' },
            { value: 'girls', label: 'Girls Only' },
            { value: 'mixed', label: 'Mixed' },
          ]}
          value={tf.gender as 'boys' | 'girls' | 'mixed' | undefined}
          onChange={(v) => set('gender', v)}
        />
      </Field>

      <Field label="Room Type" required>
        <RadioGroup
          options={[
            { value: 'single', label: 'Single' },
            { value: 'double', label: 'Double' },
            { value: 'dormitory', label: 'Dormitory' },
          ]}
          value={tf.roomType as 'single' | 'double' | 'dormitory' | undefined}
          onChange={(v) => set('roomType', v)}
        />
      </Field>

      <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
        <Field label="Total Beds" required>
          <input
            type="number"
            min={1}
            value={(tf.totalBeds as number) || ''}
            onChange={(e) => set('totalBeds', Number(e.target.value))}
            className={inputCls(false)}
            placeholder="e.g. 24"
          />
        </Field>

        <Field label="Curfew Time">
          <input
            type="time"
            value={(tf.curfewTime as string) || ''}
            onChange={(e) => set('curfewTime', e.target.value)}
            className={inputCls(false)}
          />
        </Field>
      </div>

      <Field label="Nearby College / University">
        <input
          type="text"
          placeholder="e.g. IOE Pulchowk Campus"
          value={(tf.nearbyCollege as string) || ''}
          onChange={(e) => set('nearbyCollege', e.target.value)}
          className={inputCls(false)}
        />
      </Field>

      <Toggle
        label="Meals included"
        description="Breakfast / lunch / dinner provided"
        value={(tf.mealsIncluded as boolean) || false}
        onChange={(v) => set('mealsIncluded', v)}
      />
      <Toggle
        label="Visitors allowed"
        description="Guests can visit during specified hours"
        value={(tf.visitorsAllowed as boolean) || false}
        onChange={(v) => set('visitorsAllowed', v)}
      />
    </>
  )
}

function RoomFieldsView({ tf, set }: ViewProps) {
  return (
    <>
      <Field label="BHK Type" required>
        <RadioGroup
          options={[
            { value: 'single', label: 'Single Room' },
            { value: '1BHK', label: '1 BHK' },
            { value: '2BHK', label: '2 BHK' },
            { value: '3BHK', label: '3 BHK' },
          ]}
          value={tf.bhkType as 'single' | '1BHK' | '2BHK' | '3BHK' | undefined}
          onChange={(v) => set('bhkType', v)}
        />
      </Field>

      <Field label="Furnished" required>
        <RadioGroup
          options={[
            { value: 'furnished', label: 'Furnished' },
            { value: 'semi-furnished', label: 'Semi-furnished' },
            { value: 'unfurnished', label: 'Unfurnished' },
          ]}
          value={tf.furnished as 'furnished' | 'semi-furnished' | 'unfurnished' | undefined}
          onChange={(v) => set('furnished', v)}
        />
      </Field>

      <Field label="For Whom" required>
        <RadioGroup
          options={[
            { value: 'family', label: 'Family' },
            { value: 'bachelor', label: 'Bachelor' },
            { value: 'both', label: 'Both' },
          ]}
          value={tf.forWhom as 'family' | 'bachelor' | 'both' | undefined}
          onChange={(v) => set('forWhom', v)}
        />
      </Field>

      <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
        <Field label="Deposit Amount (NPR)" required>
          <input
            type="number"
            min={0}
            value={(tf.depositAmount as number) || ''}
            onChange={(e) => set('depositAmount', Number(e.target.value))}
            className={inputCls(false)}
            placeholder="e.g. 50000"
          />
        </Field>

        <Field label="Min Stay (months)" required>
          <input
            type="number"
            min={1}
            value={(tf.minStayMonths as number) || ''}
            onChange={(e) => set('minStayMonths', Number(e.target.value))}
            className={inputCls(false)}
            placeholder="e.g. 6"
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
        <Field label="Floor Number">
          <input
            type="number"
            min={0}
            value={(tf.floor as number) ?? ''}
            onChange={(e) => set('floor', Number(e.target.value))}
            className={inputCls(false)}
            placeholder="0 = ground"
          />
        </Field>

        <Field label="Square Feet">
          <input
            type="number"
            min={0}
            value={(tf.sqft as number) || ''}
            onChange={(e) => set('sqft', Number(e.target.value))}
            className={inputCls(false)}
            placeholder="e.g. 800"
          />
        </Field>
      </div>

      <Toggle
        label="Pet allowed"
        description="Tenants can keep pets in the property"
        value={(tf.petAllowed as boolean) || false}
        onChange={(v) => set('petAllowed', v)}
      />
    </>
  )
}

function OfficeFieldsView({ tf, set }: ViewProps) {
  return (
    <>
      <Field label="Office Type" required>
        <RadioGroup
          options={[
            { value: 'private', label: 'Private' },
            { value: 'coworking', label: 'Co-working' },
            { value: 'shared', label: 'Shared' },
          ]}
          value={tf.officeType as 'private' | 'coworking' | 'shared' | undefined}
          onChange={(v) => set('officeType', v)}
        />
      </Field>

      <div className="grid sm:grid-cols-3 grid-cols-1 gap-4">
        <Field label="Square Feet" required>
          <input
            type="number"
            min={1}
            value={(tf.sqft as number) || ''}
            onChange={(e) => set('sqft', Number(e.target.value))}
            className={inputCls(false)}
            placeholder="e.g. 1200"
          />
        </Field>
        <Field label="Total Rooms / Cabins">
          <input
            type="number"
            min={0}
            value={(tf.totalRooms as number) ?? ''}
            onChange={(e) => set('totalRooms', Number(e.target.value))}
            className={inputCls(false)}
          />
        </Field>
        <Field label="Meeting Rooms">
          <input
            type="number"
            min={0}
            value={(tf.meetingRooms as number) ?? ''}
            onChange={(e) => set('meetingRooms', Number(e.target.value))}
            className={inputCls(false)}
          />
        </Field>
      </div>

      <Field label="Parking Slots">
        <input
          type="number"
          min={0}
          value={(tf.parkingSlots as number) ?? ''}
          onChange={(e) => set('parkingSlots', Number(e.target.value))}
          className={inputCls(false)}
        />
      </Field>

      <Toggle
        label="Dedicated internet"
        description="Tenant gets their own line/router"
        value={(tf.dedicatedInternet as boolean) || false}
        onChange={(v) => set('dedicatedInternet', v)}
      />
      <Toggle
        label="Lift available"
        value={(tf.liftAvailable as boolean) || false}
        onChange={(v) => set('liftAvailable', v)}
      />
      <Toggle
        label="Fire safety certified"
        description="Has valid fire-safety certificate"
        value={(tf.fireSafetyCertified as boolean) || false}
        onChange={(v) => set('fireSafetyCertified', v)}
      />
    </>
  )
}

function BusinessFieldsView({ tf, set }: ViewProps) {
  return (
    <>
      <Field label="Space Type" required>
        <RadioGroup
          options={[
            { value: 'shop', label: 'Shop' },
            { value: 'showroom', label: 'Showroom' },
            { value: 'warehouse', label: 'Warehouse' },
            { value: 'restaurant', label: 'Restaurant' },
            { value: 'other', label: 'Other' },
          ]}
          value={
            tf.spaceType as
              | 'shop'
              | 'showroom'
              | 'warehouse'
              | 'restaurant'
              | 'other'
              | undefined
          }
          onChange={(v) => set('spaceType', v)}
        />
      </Field>

      <div className="grid sm:grid-cols-2 grid-cols-1 gap-4">
        <Field label="Square Feet" required>
          <input
            type="number"
            min={1}
            value={(tf.sqft as number) || ''}
            onChange={(e) => set('sqft', Number(e.target.value))}
            className={inputCls(false)}
            placeholder="e.g. 600"
          />
        </Field>
        <Field label="Road Frontage (ft)">
          <input
            type="number"
            min={0}
            value={(tf.roadFrontage as number) ?? ''}
            onChange={(e) => set('roadFrontage', Number(e.target.value))}
            className={inputCls(false)}
            placeholder="e.g. 20"
          />
        </Field>
      </div>

      <Field label="Floor" required>
        <RadioGroup
          options={[
            { value: 'ground', label: 'Ground' },
            { value: 'first', label: '1st' },
            { value: 'basement', label: 'Basement' },
            { value: 'other', label: 'Other' },
          ]}
          value={tf.floor as 'ground' | 'first' | 'basement' | 'other' | undefined}
          onChange={(v) => set('floor', v)}
        />
      </Field>

      <Field label="Foot Traffic" required>
        <RadioGroup
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
          ]}
          value={tf.footTraffic as 'low' | 'medium' | 'high' | undefined}
          onChange={(v) => set('footTraffic', v)}
        />
      </Field>

      <Field label="Min Lease (months)" required>
        <input
          type="number"
          min={1}
          value={(tf.minLeaseMonths as number) || ''}
          onChange={(e) => set('minLeaseMonths', Number(e.target.value))}
          className={inputCls(false)}
          placeholder="e.g. 12"
        />
      </Field>

      <Toggle
        label="Corner plot"
        description="Two-side road frontage"
        value={(tf.cornerPlot as boolean) || false}
        onChange={(v) => set('cornerPlot', v)}
      />
      <Toggle
        label="Storage room"
        value={(tf.storageRoom as boolean) || false}
        onChange={(v) => set('storageRoom', v)}
      />
      <Toggle
        label="Signage allowed"
        description="Tenant can install branded signs"
        value={(tf.signageAllowed as boolean) || false}
        onChange={(v) => set('signageAllowed', v)}
      />
    </>
  )
}
