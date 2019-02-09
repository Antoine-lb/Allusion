import { Button, ControlGroup, InputGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';


import TagListItem, { StaticTagListItem } from './TagListItem';

import { ClientTag } from '../../entities/Tag';
import { withRootstore } from '../contexts/StoreContext';
import RootStore from '../stores/RootStore';

export interface ITagListProps {
  rootStore?: RootStore;
}

const TagList = ({ rootStore: { tagStore } }: ITagListProps) => {

  const [newTag, setNewTag] = useState('');

  const handleRename = (tag: ClientTag, name: string) => {
    tag.name = name;
  };

  return (
    <>
      <StaticTagListItem
        name="All images"
        onSelect={() => { console.log('All images'); }}
      />

      {
        tagStore.tagList.map((tag) => (
          <div key={`tag-${tag.id}`} className="listItem">
            <TagListItem
              name={tag.name}
              id={tag.id}
              onRemove={() => tagStore.removeTag(tag)}
              onRename={(name) => handleRename(tag, name)}
            />
          </div>
        ))
      }

      <form
        onSubmit={(e) => {
          e.preventDefault();
          tagStore.addTag(newTag); setNewTag('');
        }}
      >
        <ControlGroup
          fill={true}
          vertical={false}
          onAbort={() => setNewTag('')}
        >
          <InputGroup
            placeholder="New tag"
            onChange={(e) => setNewTag(e.target.value)}
            value={newTag}
          />
          <Button icon="add" type="submit" />
        </ControlGroup>
      </form>
    </>
  );
};

export default withRootstore(observer(TagList));
