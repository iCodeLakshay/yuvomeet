import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, Field, Segmented } from '../ui';

describe('Button', () => {
  it('fires onPress and exposes its label', () => {
    const onPress = jest.fn();
    render(<Button label="Join Plan" onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('Join Plan'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('blocks presses and reports busy while loading (no double submit)', () => {
    const onPress = jest.fn();
    render(<Button label="Publish" onPress={onPress} loading />);
    const button = screen.getByLabelText('Publish');
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });

  it('blocks presses when disabled', () => {
    const onPress = jest.fn();
    render(<Button label="Full" onPress={onPress} disabled />);
    fireEvent.press(screen.getByLabelText('Full'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Field', () => {
  it('reports typed text and shows the error and counter', () => {
    const onChangeText = jest.fn();
    render(<Field label="Bio" value="Hi" onChangeText={onChangeText} maxLength={300} counter error="Too short" />);
    fireEvent.changeText(screen.getByLabelText('Bio'), 'Hello');
    expect(onChangeText).toHaveBeenCalledWith('Hello');
    expect(screen.getByText('Too short')).toBeTruthy();
    expect(screen.getByText('2/300')).toBeTruthy();
  });
});

describe('Segmented', () => {
  it('marks the active tab and switches on press', () => {
    const onChange = jest.fn();
    render(
      <Segmented
        value="upcoming"
        onChange={onChange}
        items={[
          { value: 'upcoming', label: 'Upcoming', count: 2 },
          { value: 'past', label: 'Past' },
        ]}
      />,
    );
    expect(screen.getByLabelText('Upcoming, 2').props.accessibilityState).toMatchObject({ selected: true });
    fireEvent.press(screen.getByLabelText('Past'));
    expect(onChange).toHaveBeenCalledWith('past');
  });
});
